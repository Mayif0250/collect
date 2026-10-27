import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Role, Department } from '@prisma/client';
import prisma from './prisma';

const AUTH_COOKIE_NAME = 'laptop_collect_session';
const SECRET_KEY = process.env.AUTH_SECRET || 'laptop-collection-super-secret-key-32-chars-long-2026';
const encodedSecret = new TextEncoder().encode(SECRET_KEY);

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  permittedDepartment: Department;
}

// In-memory rate limiting map for login attempts: IP/User -> { count, firstAttempt }
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 5;

export function checkLoginRateLimit(identifier: string): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS_PER_WINDOW - 1 };
  }

  if (record.count >= MAX_ATTEMPTS_PER_WINDOW) {
    const retryAfterSec = Math.ceil((record.firstAttempt + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS_PER_WINDOW - record.count };
}

export function resetLoginRateLimit(identifier: string) {
  loginAttempts.delete(identifier);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    permittedDepartment: user.permittedDepartment,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(encodedSecret);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return {
      id: payload.id as string,
      name: payload.name as string,
      username: payload.username as string,
      role: payload.role as Role,
      permittedDepartment: payload.permittedDepartment as Department,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, username: true, role: true, permittedDepartment: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      permittedDepartment: user.permittedDepartment,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
