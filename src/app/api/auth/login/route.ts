import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const rateLimitKey = `${ip}:${username.toLowerCase()}`;
    const rateLimit = checkLoginRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${rateLimit.retryAfterSec} seconds before retrying.`,
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Reset rate limit on success
    resetLoginRateLimit(rateLimitKey);

    // Create session token
    const sessionUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      permittedDepartment: user.permittedDepartment,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ip,
        reason: 'User successfully authenticated',
      },
    });

    return NextResponse.json({
      success: true,
      user: sessionUser,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
