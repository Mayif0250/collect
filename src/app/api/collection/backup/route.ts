import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AllocationStatus, Department, Batch } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const searchParams = req.nextUrl.searchParams;

    const query = searchParams.get('q')?.trim() || '';
    const branch = searchParams.get('branch') as Department | null;
    const batch = searchParams.get('batch') as Batch | null;

    const where: any = {
      allocationStatus: AllocationStatus.BACKUP,
    };

    if (query) {
      where.OR = [
        { studentId: { contains: query, mode: 'insensitive' } },
        { collectionId: { contains: query, mode: 'insensitive' } },
        { studentName: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (branch) where.branch = branch;
    if (batch) where.batch = batch;

    const backupRecords = await prisma.laptopRecord.findMany({
      where,
      include: {
        collector: { select: { id: true, name: true, username: true } },
        room: { select: { id: true, name: true, block: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(backupRecords);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch backup inventory' }, { status: 500 });
  }
}
