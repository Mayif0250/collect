import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { checkStudentDuplicate } from '@/lib/services/collectionService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const searchParams = req.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');

    if (!studentId || !studentId.trim()) {
      return NextResponse.json({ exists: false, record: null });
    }

    const existing = await checkStudentDuplicate(studentId);
    if (!existing) {
      return NextResponse.json({ exists: false, record: null });
    }

    return NextResponse.json({
      exists: true,
      record: {
        id: existing.id,
        collectionId: existing.collectionId,
        studentId: existing.studentId,
        studentName: existing.studentName,
        branch: existing.branch,
        batch: existing.batch,
        roomName: existing.room?.name || 'Backup',
        seatNumber: existing.seatNumber,
        collectorName: existing.collector.name,
        createdAt: existing.createdAt,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Error checking duplicate' }, { status: 500 });
  }
}
