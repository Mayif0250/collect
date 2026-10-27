import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { previewCrossBlockTransfer } from '@/lib/services/overflowService';
import { Role, Department, Block } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole([Role.ADMIN]);

    const searchParams = req.nextUrl.searchParams;
    const sourceDept = searchParams.get('sourceDept') as Department;
    const destinationBlock = searchParams.get('destinationBlock') as Block;

    if (!sourceDept || !destinationBlock) {
      return NextResponse.json(
        { error: 'Source department and destination block are required parameters' },
        { status: 400 }
      );
    }

    const preview = await previewCrossBlockTransfer(sourceDept, destinationBlock);
    return NextResponse.json(preview);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to generate overflow preview' }, { status: 400 });
  }
}
