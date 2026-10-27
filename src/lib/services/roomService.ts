import { Prisma, Block, ClaimStatus, Role, Department } from '@prisma/client';
import prisma from '../prisma';

export interface RoomOccupancyInfo {
  id: string;
  block: Block;
  name: string;
  roomOrder: number;
  capacity: number;
  occupiedSeats: number;
  vacantSeats: number;
  occupancyPercentage: number;
  isFull: boolean;
  activeClaim: {
    id: string;
    collectorId: string;
    collectorName: string;
    collectorUsername: string;
    claimedAt: Date;
  } | null;
  claimStatus: ClaimStatus | 'UNCLAIMED';
}

/**
 * Get all rooms with current occupancy, capacity, and active claim info in authoritative configured order
 */
export async function getAllRoomsOccupancy(): Promise<RoomOccupancyInfo[]> {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [
      { block: 'asc' },
      { roomOrder: 'asc' },
    ],
    include: {
      laptops: {
        where: {
          allocationStatus: {
            in: ['PRIMARY', 'CROSS_BLOCK', 'BACKUP'],
          },
        },
        select: { seatNumber: true },
      },
      claims: {
        where: { status: ClaimStatus.ACTIVE },
        include: {
          collector: {
            select: { id: true, name: true, username: true },
          },
        },
        take: 1,
      },
    },
  });

  return rooms.map((room) => {
    const occupiedSeats = room.laptops.length;
    const vacantSeats = Math.max(0, room.capacity - occupiedSeats);
    const occupancyPercentage = Math.round((occupiedSeats / room.capacity) * 100);
    const isFull = occupiedSeats >= room.capacity;
    const activeClaim = room.claims[0]
      ? {
          id: room.claims[0].id,
          collectorId: room.claims[0].collector.id,
          collectorName: room.claims[0].collector.name,
          collectorUsername: room.claims[0].collector.username,
          claimedAt: room.claims[0].claimedAt,
        }
      : null;

    let claimStatus: ClaimStatus | 'UNCLAIMED' = 'UNCLAIMED';
    if (activeClaim) {
      claimStatus = ClaimStatus.ACTIVE;
    } else if (isFull) {
      claimStatus = ClaimStatus.COMPLETED;
    }

    return {
      id: room.id,
      block: room.block,
      name: room.name,
      roomOrder: room.roomOrder,
      capacity: room.capacity,
      occupiedSeats,
      vacantSeats,
      occupancyPercentage,
      isFull,
      activeClaim,
      claimStatus,
    };
  });
}

/**
 * Get the next eligible room to claim for a given block according to configured room order.
 * Considers parallel collectors: a room can be claimed if previous rooms are either claimed or full.
 */
export async function getNextClaimableRoom(block: Block): Promise<RoomOccupancyInfo | null> {
  const allRooms = await getAllRoomsOccupancy();
  const blockRooms = allRooms
    .filter((r) => r.block === block)
    .sort((a, b) => a.roomOrder - b.roomOrder);

  for (const room of blockRooms) {
    if (room.isFull) {
      continue; // Room is full, move to next
    }

    if (room.activeClaim) {
      continue; // Already claimed by someone else, move to next
    }

    // This room is not full and has no active claim. It is the next claimable room in sequence!
    return room;
  }

  return null; // All rooms full or claimed
}

/**
 * Claim an available room for an authenticated collector.
 * Uses atomic transaction to guarantee no two collectors can claim the same room.
 */
export async function claimRoom(collectorId: string, roomId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify collection session is active
    const session = await tx.collectionSession.findFirst({
      where: { isActive: true },
    });
    if (!session) {
      throw new Error('COLLECTION_SESSION_INACTIVE: Collection has not been initialized or activated by an administrator.');
    }

    // 2. Fetch collector and verify active status and permitted department
    const collector = await tx.user.findUnique({
      where: { id: collectorId },
    });
    if (!collector || !collector.isActive) {
      throw new Error('COLLECTOR_INACTIVE: Collector account is not active.');
    }

    // 3. Check if collector already has an active room claim
    const existingClaim = await tx.roomClaim.findFirst({
      where: {
        collectorId,
        status: ClaimStatus.ACTIVE,
      },
      include: { room: true },
    });
    if (existingClaim) {
      throw new Error(`ALREADY_HAS_ACTIVE_ROOM: You already have an active claim on room ${existingClaim.room.name}. Complete or release it first.`);
    }

    // 4. Fetch the room to claim
    const targetRoom = await tx.room.findUnique({
      where: { id: roomId },
    });
    if (!targetRoom || !targetRoom.isActive) {
      throw new Error('ROOM_NOT_FOUND: Room does not exist or is inactive.');
    }

    // 5. Verify department match (Backup room is universal for all departments)
    const isBackupRoom = targetRoom.name === 'Backup' || targetRoom.name === 'Backup Laptops';
    if (!isBackupRoom) {
      const expectedBlock = collector.permittedDepartment === Department.CSE ? Block.E : Block.F;
      if (targetRoom.block !== expectedBlock) {
        throw new Error(`DEPARTMENT_MISMATCH: ${collector.permittedDepartment} collectors can only claim ${expectedBlock} Block rooms.`);
      }
    }

    // 6. Check if room already has an active claim
    const roomActiveClaim = await tx.roomClaim.findFirst({
      where: {
        roomId: targetRoom.id,
        status: ClaimStatus.ACTIVE,
      },
    });
    if (roomActiveClaim) {
      throw new Error(`ROOM_ALREADY_CLAIMED: Room ${targetRoom.name} is currently claimed by another collector.`);
    }

    // 7. Check room capacity
    const currentAllocations = await tx.laptopRecord.count({
      where: {
        roomId: targetRoom.id,
        allocationStatus: { in: ['PRIMARY', 'CROSS_BLOCK', 'BACKUP'] },
      },
    });
    if (currentAllocations >= targetRoom.capacity) {
      throw new Error(`ROOM_FULL: Room ${targetRoom.name} has already reached its capacity of ${targetRoom.capacity}.`);
    }

    // 8. Verify room order constraint:
    // Any room before targetRoom in the same block MUST either be full or currently claimed by an active collector.
    if (!isBackupRoom) {
      const precedingRooms = await tx.room.findMany({
        where: {
          block: targetRoom.block,
          roomOrder: { lt: targetRoom.roomOrder },
          isActive: true,
        },
        orderBy: { roomOrder: 'asc' },
        include: {
          claims: { where: { status: ClaimStatus.ACTIVE } },
          laptops: { where: { allocationStatus: { in: ['PRIMARY', 'CROSS_BLOCK', 'BACKUP'] } } },
        },
      });

      for (const prec of precedingRooms) {
        const isPrecFull = prec.laptops.length >= prec.capacity;
        const hasActiveClaim = prec.claims.length > 0;
        if (!isPrecFull && !hasActiveClaim) {
          throw new Error(
            `ORDER_VIOLATION: Room ${prec.name} (Order ${prec.roomOrder}) is vacant and unclaimed. You must claim rooms in configured sequence.`
          );
        }
      }
    }

    // 9. Create the RoomClaim
    const newClaim = await tx.roomClaim.create({
      data: {
        roomId: targetRoom.id,
        collectorId: collector.id,
        status: ClaimStatus.ACTIVE,
      },
      include: {
        room: true,
      },
    });

    // 10. Audit log
    await tx.auditLog.create({
      data: {
        userId: collector.id,
        action: 'CLAIM_ROOM',
        entityType: 'RoomClaim',
        entityId: newClaim.id,
        newValue: {
          roomId: targetRoom.id,
          roomName: targetRoom.name,
          roomOrder: targetRoom.roomOrder,
          block: targetRoom.block,
        },
        reason: 'Collector claimed room for collection',
      },
    });

    return newClaim;
  }, { maxWait: 15000, timeout: 25000 });
}

/**
 * Complete an active claimed room.
 */
export async function completeRoom(collectorId: string, roomId: string) {
  return await prisma.$transaction(async (tx) => {
    const claim = await tx.roomClaim.findFirst({
      where: {
        roomId,
        collectorId,
        status: ClaimStatus.ACTIVE,
      },
      include: { room: true },
    });

    if (!claim) {
      throw new Error('NO_ACTIVE_CLAIM: No active claim found for this room and collector.');
    }

    const updatedClaim = await tx.roomClaim.update({
      where: { id: claim.id },
      data: {
        status: ClaimStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: collectorId,
        action: 'COMPLETE_ROOM',
        entityType: 'RoomClaim',
        entityId: claim.id,
        previousValue: { status: ClaimStatus.ACTIVE },
        newValue: { status: ClaimStatus.COMPLETED },
        reason: 'Collector marked room as completed',
      },
    });

    return updatedClaim;
  }, { maxWait: 15000, timeout: 25000 });
}

/**
 * Release an active room claim (Admin action).
 */
export async function releaseRoomClaim(adminId: string, claimId: string, reason: string) {
  return await prisma.$transaction(async (tx) => {
    const claim = await tx.roomClaim.findUnique({
      where: { id: claimId },
      include: { room: true, collector: true },
    });

    if (!claim || claim.status !== ClaimStatus.ACTIVE) {
      throw new Error('CLAIM_NOT_ACTIVE: Specified room claim is not active.');
    }

    const updatedClaim = await tx.roomClaim.update({
      where: { id: claimId },
      data: {
        status: ClaimStatus.RELEASED,
        releasedAt: new Date(),
        releaseReason: reason,
        auditAdminId: adminId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'RELEASE_ROOM_CLAIM',
        entityType: 'RoomClaim',
        entityId: claimId,
        previousValue: { status: ClaimStatus.ACTIVE, collectorId: claim.collectorId, roomId: claim.roomId },
        newValue: { status: ClaimStatus.RELEASED, releaseReason: reason },
        reason,
      },
    });

    return updatedClaim;
  }, { maxWait: 15000, timeout: 25000 });
}

/**
 * Reassign an active room claim to another collector (Admin action).
 */
export async function reassignRoomClaim(adminId: string, claimId: string, newCollectorId: string, reason: string) {
  return await prisma.$transaction(async (tx) => {
    const claim = await tx.roomClaim.findUnique({
      where: { id: claimId },
      include: { room: true, collector: true },
    });

    if (!claim || claim.status !== ClaimStatus.ACTIVE) {
      throw new Error('CLAIM_NOT_ACTIVE: Specified room claim is not active.');
    }

    const newCollector = await tx.user.findUnique({
      where: { id: newCollectorId },
    });

    if (!newCollector || !newCollector.isActive) {
      throw new Error('NEW_COLLECTOR_INACTIVE: Target collector is not active.');
    }

    const expectedBlock = newCollector.permittedDepartment === Department.CSE ? Block.E : Block.F;
    if (claim.room.block !== expectedBlock) {
      throw new Error(`DEPARTMENT_MISMATCH: Cannot assign ${claim.room.block} Block room to ${newCollector.permittedDepartment} collector.`);
    }

    // Release old claim
    await tx.roomClaim.update({
      where: { id: claimId },
      data: {
        status: ClaimStatus.REASSIGNED,
        releasedAt: new Date(),
        releaseReason: reason,
        reassignedToCollectorId: newCollectorId,
        auditAdminId: adminId,
      },
    });

    // Create new claim for the new collector
    const newClaim = await tx.roomClaim.create({
      data: {
        roomId: claim.roomId,
        collectorId: newCollectorId,
        status: ClaimStatus.ACTIVE,
      },
      include: { room: true },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'REASSIGN_ROOM_CLAIM',
        entityType: 'RoomClaim',
        entityId: newClaim.id,
        previousValue: { collectorId: claim.collectorId, status: ClaimStatus.ACTIVE },
        newValue: { collectorId: newCollectorId, status: ClaimStatus.ACTIVE, previousClaimId: claimId },
        reason,
      },
    });

    return newClaim;
  }, { maxWait: 15000, timeout: 25000 });
}
