import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role, Department } from '@prisma/client';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  password: z.string().min(6).optional(),
  permittedDepartment: z.enum([Department.CSE, Department.ECE, Department.ALL]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole([Role.ADMIN]);
    const { id } = await params;

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.format() }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deactivating own admin account accidentally
    if (targetUser.id === admin.id && parsed.data.isActive === false) {
      return NextResponse.json({ error: 'Cannot deactivate your own administrator account' }, { status: 400 });
    }

    const updateData: any = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.permittedDepartment !== undefined) updateData.permittedDepartment = parsed.data.permittedDepartment;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        permittedDepartment: true,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: id,
        previousValue: {
          isActive: targetUser.isActive,
          permittedDepartment: targetUser.permittedDepartment,
        },
        newValue: {
          isActive: updatedUser.isActive,
          permittedDepartment: updatedUser.permittedDepartment,
        },
        reason: 'Administrator modified collector account status',
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}
