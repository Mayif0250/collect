import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { completeRoom } from '@/lib/services/roomService';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const claim = await completeRoom(user.id, roomId);
    return NextResponse.json({ success: true, claim });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to complete room' }, { status: 400 });
  }
}
