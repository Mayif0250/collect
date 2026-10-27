import { Prisma, Department, Block, Batch, AllocationStatus, ClaimStatus } from '@prisma/client';
import prisma from '../prisma';

export interface RegisterLaptopInput {
  studentId: string;
  batch: Batch;
  studentName?: string;
  isSubmitterPresent: boolean;
  submitterStudentId?: string;
  collectorId: string;
  idempotencyKey?: string;
  allowDuplicateOverride?: boolean;
  duplicateReason?: string;
}

export interface RegisterLaptopResult {
  success: boolean;
  duplicateWarning?: boolean;
  existingRecord?: {
    id: string;
    collectionId: string;
    studentId: string;
    studentName: string | null;
    branch: Department;
    batch: Batch;
    createdAt: Date;
    roomName?: string | null;
    seatNumber?: number | null;
  };
  record?: {
    id: string;
    collectionId: string;
    studentId: string;
    studentName: string | null;
    branch: Department;
    batch: Batch;
    allocationStatus: AllocationStatus;
    roomId: string | null;
    roomName: string | null;
    seatNumber: number | null;
    createdAt: Date;
  };
  message?: string;
}

function generateRandomSuffix(len = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/**
 * Check if a student ID already has an existing submission
 */
export async function checkStudentDuplicate(studentId: string) {
  const normalizedId = studentId.trim().toUpperCase();
  return await prisma.laptopRecord.findFirst({
    where: { studentId: normalizedId },
    include: {
      room: { select: { name: true } },
      collector: { select: { name: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Register a laptop with atomic seat assignment and idempotency protection
 */
export async function registerLaptop(input: RegisterLaptopInput): Promise<RegisterLaptopResult> {
  const normalizedStudentId = input.studentId.trim().toUpperCase();
  const normalizedSubmitterId = input.submitterStudentId?.trim().toUpperCase() || null;
  const normalizedStudentName = input.studentName?.trim() || null;

  // 1. Idempotency Check
  if (input.idempotencyKey) {
    const existingIdempotent = await prisma.idempotencyRecord.findUnique({
      where: { key: input.idempotencyKey },
    });
    if (existingIdempotent) {
      const parsed = JSON.parse(existingIdempotent.responseJson);
      return parsed;
    }
  }

  // 2. Duplicate Student ID Check
  const existingStudent = await checkStudentDuplicate(normalizedStudentId);
  if (existingStudent && !input.allowDuplicateOverride) {
    return {
      success: false,
      duplicateWarning: true,
      existingRecord: {
        id: existingStudent.id,
        collectionId: existingStudent.collectionId,
        studentId: existingStudent.studentId,
        studentName: existingStudent.studentName,
        branch: existingStudent.branch,
        batch: existingStudent.batch,
        createdAt: existingStudent.createdAt,
        roomName: existingStudent.room?.name || null,
        seatNumber: existingStudent.seatNumber,
      },
      message: `Verification Warning: Student ID ${normalizedStudentId} was already registered under Collection ID ${existingStudent.collectionId}. An authorized exception override is required to proceed.`,
    };
  }

  // 3. Execute registration in a database transaction
  const result = await prisma.$transaction(async (tx) => {
    // A. Check collection session status
    const session = await tx.collectionSession.findFirst({
      where: { isActive: true },
    });
    if (!session) {
      throw new Error('COLLECTION_SESSION_INACTIVE: Collection session is currently closed or uninitialized.');
    }

    // B. Check collector
    const collector = await tx.user.findUnique({
      where: { id: input.collectorId },
    });
    if (!collector || !collector.isActive) {
      throw new Error('COLLECTOR_INACTIVE: Collector account is deactivated or not found.');
    }

    const branch = collector.permittedDepartment;
    if (branch !== Department.CSE && branch !== Department.ECE) {
      throw new Error('INVALID_DEPARTMENT: Collector must have CSE or ECE permitted department to collect laptops.');
    }
    const primaryBlock = branch === Department.CSE ? Block.E : Block.F;

    // C. Check total block capacity and occupancy
    const blockRooms = await tx.room.findMany({
      where: { block: primaryBlock, isActive: true },
      orderBy: { roomOrder: 'asc' },
      include: {
        laptops: {
          where: { allocationStatus: { in: ['PRIMARY', 'CROSS_BLOCK'] } },
          select: { id: true },
        },
      },
    });

    const totalBlockCapacity = blockRooms.reduce((sum, r) => sum + r.capacity, 0);
    const totalBlockOccupancy = blockRooms.reduce((sum, r) => sum + r.laptops.length, 0);
    const isPrimaryBlockEntirelyFull = totalBlockOccupancy >= totalBlockCapacity;

    // D. Fetch collector's active claim
    const activeClaim = await tx.roomClaim.findFirst({
      where: {
        collectorId: collector.id,
        status: ClaimStatus.ACTIVE,
      },
      include: { room: true },
    });

    let allocationStatus: AllocationStatus = AllocationStatus.PRIMARY;
    let targetRoomId: string | null = null;
    let targetRoomName: string | null = null;
    let assignedSeat: number | null = null;
    let collectionId = '';

    if (isPrimaryBlockEntirelyFull) {
      // Primary block is completely full -> record in backup inventory
      allocationStatus = AllocationStatus.BACKUP;
      collectionId = `COL-${branch}-BACKUP-${Date.now().toString(36).toUpperCase()}-${generateRandomSuffix(3)}`;
    } else {
      // Primary block has space. Collector MUST have an active room claimed
      if (!activeClaim) {
        throw new Error('NO_ACTIVE_ROOM_CLAIM: You have no active claimed room. Please claim the next available room before collecting laptops.');
      }

      // Check current room occupancy
      const roomAllocations = await tx.laptopRecord.count({
        where: {
          roomId: activeClaim.roomId,
          allocationStatus: { in: ['PRIMARY', 'CROSS_BLOCK'] },
        },
      });

      if (roomAllocations >= activeClaim.room.capacity) {
        throw new Error(
          `ROOM_FULL: Claimed room ${activeClaim.room.name} is full (${activeClaim.room.capacity}/${activeClaim.room.capacity}). Please complete this room and claim the next available room.`
        );
      }

      // Next sequential seat
      assignedSeat = roomAllocations + 1;
      targetRoomId = activeClaim.roomId;
      targetRoomName = activeClaim.room.name;
      collectionId = `COL-${branch}-${activeClaim.room.name}-${String(assignedSeat).padStart(2, '0')}-${generateRandomSuffix(3)}`;
    }

    // E. Create LaptopRecord
    const newRecord = await tx.laptopRecord.create({
      data: {
        collectionId,
        studentId: normalizedStudentId,
        studentName: normalizedStudentName,
        branch,
        batch: input.batch,
        isSubmitterPresent: input.isSubmitterPresent,
        submitterStudentId: input.isSubmitterPresent ? null : normalizedSubmitterId,
        primaryBlock,
        allocationStatus,
        roomId: targetRoomId,
        seatNumber: assignedSeat,
        collectorId: collector.id,
        isDuplicateOverride: !!input.allowDuplicateOverride,
        duplicateReason: input.duplicateReason || null,
        idempotencyKey: input.idempotencyKey || null,
      },
    });

    // F. Audit log
    await tx.auditLog.create({
      data: {
        userId: collector.id,
        action: 'REGISTER_LAPTOP',
        entityType: 'LaptopRecord',
        entityId: newRecord.id,
        newValue: {
          collectionId,
          studentId: normalizedStudentId,
          branch,
          batch: input.batch,
          allocationStatus,
          roomName: targetRoomName,
          seatNumber: assignedSeat,
          isDuplicateOverride: !!input.allowDuplicateOverride,
        },
        reason: input.allowDuplicateOverride ? `Duplicate override: ${input.duplicateReason}` : 'Standard laptop collection registration',
      },
    });

    const responseData: RegisterLaptopResult = {
      success: true,
      record: {
        id: newRecord.id,
        collectionId: newRecord.collectionId,
        studentId: newRecord.studentId,
        studentName: newRecord.studentName,
        branch: newRecord.branch,
        batch: newRecord.batch,
        allocationStatus: newRecord.allocationStatus,
        roomId: newRecord.roomId,
        roomName: targetRoomName,
        seatNumber: newRecord.seatNumber,
        createdAt: newRecord.createdAt,
      },
    };

    // G. Store idempotency record if key was provided
    if (input.idempotencyKey) {
      await tx.idempotencyRecord.create({
        data: {
          key: input.idempotencyKey,
          responseJson: JSON.stringify(responseData),
        },
      });
    }

    return responseData;
  });

  return result;
}

/**
 * Get recent submissions for a specific collector
 */
export async function getCollectorRecentSubmissions(collectorId: string, limit = 10) {
  return await prisma.laptopRecord.findMany({
    where: { collectorId },
    include: {
      room: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Audited administrative correction of a laptop record (e.g. fixing student ID typo)
 */
export async function updateLaptopRecordAudited(
  adminId: string,
  recordId: string,
  updates: {
    studentId?: string;
    studentName?: string;
    batch?: Batch;
    submitterStudentId?: string;
  },
  reason: string
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.laptopRecord.findUnique({
      where: { id: recordId },
      include: { room: true },
    });

    if (!existing) {
      throw new Error('RECORD_NOT_FOUND: Laptop record does not exist.');
    }

    const updated = await tx.laptopRecord.update({
      where: { id: recordId },
      data: {
        studentId: updates.studentId ? updates.studentId.trim().toUpperCase() : existing.studentId,
        studentName: updates.studentName !== undefined ? updates.studentName.trim() || null : existing.studentName,
        batch: updates.batch ?? existing.batch,
        submitterStudentId: updates.submitterStudentId !== undefined ? updates.submitterStudentId.trim().toUpperCase() || null : existing.submitterStudentId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_LAPTOP_RECORD',
        entityType: 'LaptopRecord',
        entityId: recordId,
        previousValue: {
          studentId: existing.studentId,
          studentName: existing.studentName,
          batch: existing.batch,
        },
        newValue: {
          studentId: updated.studentId,
          studentName: updated.studentName,
          batch: updated.batch,
        },
        reason,
      },
    });

    return updated;
  });
}
