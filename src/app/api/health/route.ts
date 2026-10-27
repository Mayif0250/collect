import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const startTime = Date.now();
    // Test database connectivity
    const roomCount = await prisma.room.count();
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      roomCount,
      latencyMs: durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message || 'Database connection error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
