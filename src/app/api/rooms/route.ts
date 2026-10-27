import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAllRoomsOccupancy } from '@/lib/services/roomService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const rooms = await getAllRoomsOccupancy();
    return NextResponse.json(rooms);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch rooms' }, { status: 500 });
  }
}
