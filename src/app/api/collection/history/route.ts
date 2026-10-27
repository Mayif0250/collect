import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Department, Batch, AllocationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = req.nextUrl.searchParams;

    const query = searchParams.get('q')?.trim() || '';
    const branch = searchParams.get('branch') as Department | null;
    const batch = searchParams.get('batch') as Batch | null;
    const status = searchParams.get('status') as AllocationStatus | null;
    const roomId = searchParams.get('roomId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {};

    // If collector, default to their own records unless admin
    if (user.role === 'CSE_COLLECTOR' || user.role === 'ECE_COLLECTOR') {
      where.collectorId = user.id;
    }

    if (query) {
      where.OR = [
        { studentId: { contains: query, mode: 'insensitive' } },
        { collectionId: { contains: query, mode: 'insensitive' } },
        { studentName: { contains: query, mode: 'insensitive' } },
        { submitterStudentId: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (branch && (user.role === 'ADMIN' || user.permittedDepartment === branch)) {
      where.branch = branch;
    }
    if (batch) where.batch = batch;
    if (status) where.allocationStatus = status;
    if (roomId) where.roomId = roomId;

    const records = await prisma.laptopRecord.findMany({
      where,
      include: {
        room: { select: { id: true, name: true, block: true } },
        collector: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });

    return NextResponse.json(records);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch history' }, { status: 500 });
  }
}
