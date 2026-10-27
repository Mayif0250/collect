import { NextResponse } from 'next/server';
import { clearSessionCookie, getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGOUT',
          entityType: 'User',
          entityId: user.id,
          reason: 'User logged out',
        },
      });
    }

    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Logout failed' }, { status: 500 });
  }
}
