import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { executeCrossBlockTransfer } from '@/lib/services/overflowService';
import { Role, Department, Block } from '@prisma/client';
import { z } from 'zod';

const executeSchema = z.object({
  sourceDept: z.enum([Department.CSE, Department.ECE]),
  destinationBlock: z.enum([Block.E, Block.F]),
  reason: z.string().trim().min(5, 'A clear reason of at least 5 characters is required for overflow authorization'),
  maxCount: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole([Role.ADMIN]);

    const body = await req.json();
    const parsed = executeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.format() }, { status: 400 });
    }

    const { sourceDept, destinationBlock, reason, maxCount } = parsed.data;

    const result = await executeCrossBlockTransfer(
      admin.id,
      sourceDept,
      destinationBlock,
      reason,
      maxCount
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to execute cross-block transfer' }, { status: 400 });
  }
}
