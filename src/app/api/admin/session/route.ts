import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole([Role.ADMIN]);
    const body = await req.json().catch(() => ({}));
    const { action } = body; // 'activate' | 'pause' | 'initialize'

    let session = await prisma.collectionSession.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      session = await prisma.collectionSession.create({
        data: {
          sessionName: 'College Laptop Collection & Room Allocation',
          isActive: true,
          initializedBy: admin.id,
          activatedAt: new Date(),
        },
      });
    } else {
      const shouldBeActive = action === 'activate' || (action === 'toggle' ? !session.isActive : true);
      session = await prisma.collectionSession.update({
        where: { id: session.id },
        data: {
          isActive: shouldBeActive,
          activatedAt: shouldBeActive ? new Date() : session.activatedAt,
          closedAt: shouldBeActive ? null : new Date(),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: session.isActive ? 'ACTIVATE_SESSION' : 'PAUSE_SESSION',
        entityType: 'CollectionSession',
        entityId: session.id,
        newValue: { isActive: session.isActive },
        reason: `Administrator set collection session active status to ${session.isActive}`,
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update session' }, { status: 500 });
  }
}
