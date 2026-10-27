import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { claimRoom, getNextClaimableRoom } from '@/lib/services/roomService';
import { Block, Department } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== 'CSE_COLLECTOR' && user.role !== 'ECE_COLLECTOR') {
      return NextResponse.json({ error: 'Only collectors can claim rooms' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    let roomId = body.roomId;

    // If roomId is not explicitly passed, find the next sequential claimable room for their block
    if (!roomId) {
      const block = user.permittedDepartment === Department.CSE ? Block.E : Block.F;
      const nextRoom = await getNextClaimableRoom(block);
      if (!nextRoom) {
        return NextResponse.json(
          { error: `No rooms are currently available to claim in ${block} Block. All rooms are either full or actively claimed.` },
          { status: 400 }
        );
      }
      roomId = nextRoom.id;
    }

    const claim = await claimRoom(user.id, roomId);
    return NextResponse.json({ success: true, claim });
  } catch (error: any) {
    console.error('Error claiming room:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to claim room' }, { status: 400 });
  }
}
