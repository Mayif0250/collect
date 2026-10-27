import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role, Department } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum([Role.ADMIN, Role.CSE_COLLECTOR, Role.ECE_COLLECTOR]),
  permittedDepartment: z.enum([Department.CSE, Department.ECE, Department.ALL]),
});

export async function GET() {
  try {
    await requireRole([Role.ADMIN]);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        permittedDepartment: true,
        isActive: true,
        createdAt: true,
        roomClaims: {
          where: { status: 'ACTIVE' },
          include: { room: true },
        },
        _count: {
          select: { laptopRecords: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole([Role.ADMIN]);

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.format() }, { status: 400 });
    }

    const { name, username, password, role, permittedDepartment } = parsed.data;

    // Check username uniqueness
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json({ error: 'Username already in use' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash,
        role,
        permittedDepartment,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        permittedDepartment: true,
        isActive: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'CREATE_USER',
        entityType: 'User',
        entityId: newUser.id,
        newValue: { name, username, role, permittedDepartment },
        reason: 'Administrator created new user account',
      },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}
