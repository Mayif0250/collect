import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { releaseRoomClaim } from '@/lib/services/roomService';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole([Role.ADMIN]);

    const body = await req.json();
    const { claimId, reason } = body;

    if (!claimId || !reason) {
      return NextResponse.json({ error: 'Claim ID and administrative reason are required' }, { status: 400 });
    }

    const updatedClaim = await releaseRoomClaim(admin.id, claimId, reason);
    return NextResponse.json({ success: true, claim: updatedClaim });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to release room claim' }, { status: 400 });
  }
}
