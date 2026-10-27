import { Department, Block, AllocationStatus } from '@prisma/client';
import prisma from '../prisma';

export interface ProposedAssignment {
  laptopId: string;
  studentId: string;
  studentName: string | null;
  branch: Department;
  batch: string;
  collectionId: string;
  proposedRoomId: string;
  proposedRoomName: string;
  proposedSeatNumber: number;
}

export interface OverflowPreview {
  sourceDept: Department;
  destinationBlock: Block;
  eligibleBackupCount: number;
  destinationVacancies: number;
  transferrableCount: number;
  proposedAssignments: ProposedAssignment[];
}

/**
 * Preview cross-block allocation before administrator confirms
 */
export async function previewCrossBlockTransfer(
  sourceDept: Department,
  destinationBlock: Block
): Promise<OverflowPreview> {
  // Validate department-block pairing
  if (sourceDept === Department.CSE && destinationBlock !== Block.F) {
    throw new Error('INVALID_TRANSFER: CSE backup laptops can only be transferred to F Block.');
  }
  if (sourceDept === Department.ECE && destinationBlock !== Block.E) {
    throw new Error('INVALID_TRANSFER: ECE backup laptops can only be transferred to E Block.');
  }

  // 1. Fetch eligible backup laptops in FIFO order
  const backupLaptops = await prisma.laptopRecord.findMany({
    where: {
      branch: sourceDept,
      allocationStatus: AllocationStatus.BACKUP,
    },
    orderBy: { createdAt: 'asc' },
  });

  // 2. Fetch destination block rooms in authoritative order
  const destRooms = await prisma.room.findMany({
    where: {
      block: destinationBlock,
      isActive: true,
    },
    orderBy: { roomOrder: 'asc' },
    include: {
      laptops: {
        where: {
          allocationStatus: { in: [AllocationStatus.PRIMARY, AllocationStatus.CROSS_BLOCK] },
        },
        select: { seatNumber: true },
      },
    },
  });

  // 3. Find vacant seats in configured room order
  const vacantSeats: Array<{ roomId: string; roomName: string; seatNumber: number }> = [];

  for (const room of destRooms) {
    const occupiedSeatNumbers = new Set(room.laptops.map((l) => l.seatNumber));
    for (let seat = 1; seat <= room.capacity; seat++) {
      if (!occupiedSeatNumbers.has(seat)) {
        vacantSeats.push({
          roomId: room.id,
          roomName: room.name,
          seatNumber: seat,
        });
      }
    }
  }

  const transferrableCount = Math.min(backupLaptops.length, vacantSeats.length);
  const proposedAssignments: ProposedAssignment[] = [];

  for (let i = 0; i < transferrableCount; i++) {
    const laptop = backupLaptops[i];
    const seat = vacantSeats[i];
    proposedAssignments.push({
      laptopId: laptop.id,
      studentId: laptop.studentId,
      studentName: laptop.studentName,
      branch: laptop.branch,
      batch: laptop.batch,
      collectionId: laptop.collectionId,
      proposedRoomId: seat.roomId,
      proposedRoomName: seat.roomName,
      proposedSeatNumber: seat.seatNumber,
    });
  }

  return {
    sourceDept,
    destinationBlock,
    eligibleBackupCount: backupLaptops.length,
    destinationVacancies: vacantSeats.length,
    transferrableCount,
    proposedAssignments,
  };
}

/**
 * Execute cross-block transfer atomically within a database transaction
 */
export async function executeCrossBlockTransfer(
  adminId: string,
  sourceDept: Department,
  destinationBlock: Block,
  reason: string,
  maxCount?: number
) {
  if (!reason || reason.trim().length === 0) {
    throw new Error('REASON_REQUIRED: An administrative reason must be provided for cross-block overflow transfer.');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Verify admin
    const admin = await tx.user.findUnique({
      where: { id: adminId },
    });
    if (!admin || !admin.isActive || admin.role !== 'ADMIN') {
      throw new Error('UNAUTHORIZED_ADMIN: Only active administrators can authorize cross-block transfers.');
    }

    // 2. Fetch destination block rooms in configured order
    const destRooms = await tx.room.findMany({
      where: {
        block: destinationBlock,
        isActive: true,
      },
      orderBy: { roomOrder: 'asc' },
      include: {
        laptops: {
          where: {
            allocationStatus: { in: [AllocationStatus.PRIMARY, AllocationStatus.CROSS_BLOCK] },
          },
          select: { seatNumber: true },
        },
      },
    });

    // 3. Find vacant seats in strict sequential order
    const vacantSeats: Array<{ roomId: string; roomName: string; seatNumber: number }> = [];
    for (const room of destRooms) {
      const occupiedSeatNumbers = new Set(room.laptops.map((l) => l.seatNumber));
      for (let seat = 1; seat <= room.capacity; seat++) {
        if (!occupiedSeatNumbers.has(seat)) {
          vacantSeats.push({
            roomId: room.id,
            roomName: room.name,
            seatNumber: seat,
          });
        }
      }
    }

    // 4. Fetch eligible backup laptops
    const backupLaptops = await tx.laptopRecord.findMany({
      where: {
        branch: sourceDept,
        allocationStatus: AllocationStatus.BACKUP,
      },
      orderBy: { createdAt: 'asc' },
    });

    const transferLimit = maxCount ? Math.min(backupLaptops.length, vacantSeats.length, maxCount) : Math.min(backupLaptops.length, vacantSeats.length);

    if (transferLimit <= 0) {
      throw new Error('NO_TRANSFERRABLE_LAPTOPS: No eligible backup laptops or no destination vacancies available.');
    }

    // 5. Create CrossBlockTransfer audit entity
    const transferRecord = await tx.crossBlockTransfer.create({
      data: {
        adminId,
        sourceDept,
        destinationBlock,
        laptopCount: transferLimit,
        reason: reason.trim(),
      },
    });

    // 6. Atomically update each laptop record to CROSS_BLOCK
    for (let i = 0; i < transferLimit; i++) {
      const laptop = backupLaptops[i];
      const seat = vacantSeats[i];

      await tx.laptopRecord.update({
        where: { id: laptop.id },
        data: {
          allocationStatus: AllocationStatus.CROSS_BLOCK,
          roomId: seat.roomId,
          seatNumber: seat.seatNumber,
          crossBlockTransferId: transferRecord.id,
        },
      });
    }

    // 7. Audit log entry
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'EXECUTE_CROSS_BLOCK_TRANSFER',
        entityType: 'CrossBlockTransfer',
        entityId: transferRecord.id,
        newValue: {
          sourceDept,
          destinationBlock,
          laptopCount: transferLimit,
          reason,
        },
        reason,
      },
    });

    return {
      success: true,
      transferRecord,
      transferredCount: transferLimit,
    };
  });
}
