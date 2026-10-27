import { Department, Block, AllocationStatus, ClaimStatus, Batch } from '@prisma/client';
import prisma from '../prisma';

export interface DashboardMetrics {
  totalCollected: number;
  cseCollected: number;
  eceCollected: number;
  eBlockAllocated: number;
  fBlockAllocated: number;
  eBlockVacant: number;
  fBlockVacant: number;
  eBlockCapacity: number;
  fBlockCapacity: number;
  totalCapacity: number;
  backupCount: number;
  cseBackupCount: number;
  eceBackupCount: number;
  crossBlockCount: number;
  batchO23Count: number;
  batchO21Count: number;
  activeCollectorsCount: number;
  activeSession: {
    id: string;
    isActive: boolean;
    sessionName: string;
    activatedAt: Date | null;
  } | null;
  activeRoomClaims: Array<{
    claimId: string;
    roomId: string;
    roomName: string;
    block: Block;
    collectorId: string;
    collectorName: string;
    collectorUsername: string;
    claimedAt: Date;
    capacity: number;
    occupiedSeats: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    userName: string | null;
    reason: string | null;
    createdAt: Date;
  }>;
  duplicateWarningsCount: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    totalCollected,
    cseCollected,
    eceCollected,
    backupCount,
    cseBackupCount,
    eceBackupCount,
    crossBlockCount,
    batchO23Count,
    batchO21Count,
    duplicateWarningsCount,
    rooms,
    activeClaims,
    recentAudits,
    session,
  ] = await Promise.all([
    prisma.laptopRecord.count(),
    prisma.laptopRecord.count({ where: { branch: Department.CSE } }),
    prisma.laptopRecord.count({ where: { branch: Department.ECE } }),
    prisma.laptopRecord.count({ where: { allocationStatus: AllocationStatus.BACKUP } }),
    prisma.laptopRecord.count({ where: { branch: Department.CSE, allocationStatus: AllocationStatus.BACKUP } }),
    prisma.laptopRecord.count({ where: { branch: Department.ECE, allocationStatus: AllocationStatus.BACKUP } }),
    prisma.laptopRecord.count({ where: { allocationStatus: AllocationStatus.CROSS_BLOCK } }),
    prisma.laptopRecord.count({ where: { batch: Batch.O23 } }),
    prisma.laptopRecord.count({ where: { batch: Batch.O21 } }),
    prisma.laptopRecord.count({ where: { isDuplicateOverride: true } }),
    prisma.room.findMany({
      where: { isActive: true },
      include: {
        laptops: {
          where: { allocationStatus: { in: [AllocationStatus.PRIMARY, AllocationStatus.CROSS_BLOCK] } },
          select: { id: true },
        },
      },
    }),
    prisma.roomClaim.findMany({
      where: { status: ClaimStatus.ACTIVE },
      include: {
        room: true,
        collector: { select: { id: true, name: true, username: true } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { user: { select: { name: true, username: true } } },
    }),
    prisma.collectionSession.findFirst({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  let eBlockAllocated = 0;
  let fBlockAllocated = 0;
  let eBlockCapacity = 0;
  let fBlockCapacity = 0;

  for (const r of rooms) {
    if (r.block === Block.E) {
      eBlockCapacity += r.capacity;
      eBlockAllocated += r.laptops.length;
    } else if (r.block === Block.F) {
      fBlockCapacity += r.capacity;
      fBlockAllocated += r.laptops.length;
    }
  }

  const eBlockVacant = Math.max(0, eBlockCapacity - eBlockAllocated);
  const fBlockVacant = Math.max(0, fBlockCapacity - fBlockAllocated);

  const activeClaimsWithOccupancy = await Promise.all(
    activeClaims.map(async (c) => {
      const occupied = await prisma.laptopRecord.count({
        where: { roomId: c.roomId, allocationStatus: { in: [AllocationStatus.PRIMARY, AllocationStatus.CROSS_BLOCK] } },
      });
      return {
        claimId: c.id,
        roomId: c.roomId,
        roomName: c.room.name,
        block: c.room.block,
        collectorId: c.collector.id,
        collectorName: c.collector.name,
        collectorUsername: c.collector.username,
        claimedAt: c.claimedAt,
        capacity: c.room.capacity,
        occupiedSeats: occupied,
      };
    })
  );

  return {
    totalCollected,
    cseCollected,
    eceCollected,
    eBlockAllocated,
    fBlockAllocated,
    eBlockVacant,
    fBlockVacant,
    eBlockCapacity,
    fBlockCapacity,
    totalCapacity: eBlockCapacity + fBlockCapacity,
    backupCount,
    cseBackupCount,
    eceBackupCount,
    crossBlockCount,
    batchO23Count,
    batchO21Count,
    activeCollectorsCount: activeClaims.length,
    activeSession: session
      ? {
          id: session.id,
          isActive: session.isActive,
          sessionName: session.sessionName,
          activatedAt: session.activatedAt,
        }
      : null,
    activeRoomClaims: activeClaimsWithOccupancy,
    recentActivity: recentAudits.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      userName: a.user?.name || 'System',
      reason: a.reason,
      createdAt: a.createdAt,
    })),
    duplicateWarningsCount,
  };
}
