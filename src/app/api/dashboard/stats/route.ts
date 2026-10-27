import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDashboardMetrics } from '@/lib/services/statsService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const metrics = await getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}
