import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { registerLaptop } from '@/lib/services/collectionService';
import { z } from 'zod';
import { Batch, Department } from '@prisma/client';

const registerSchema = z.object({
  studentId: z.string().trim().min(1, 'Student ID is required'),
  studentName: z.string().trim().min(1, 'Student Name is required'),
  phoneNumber: z.string().trim().min(10, 'Valid Phone Number is required (at least 10 digits)'),
  batch: z.enum([Batch.O23, Batch.O22, Batch.O21], { message: 'Batch must be O23, O22, or O21' }),
  branch: z.enum([Department.CSE, Department.ECE]).optional(),
  isSubmitterPresent: z.boolean().default(true),
  submitterStudentId: z.string().trim().optional(),
  idempotencyKey: z.string().trim().optional(),
  allowDuplicateOverride: z.boolean().optional().default(false),
  duplicateReason: z.string().trim().optional(),
  directToBackup: z.boolean().optional().default(false),
  backupReason: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== 'CSE_COLLECTOR' && user.role !== 'ECE_COLLECTOR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized role for registration' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (!data.isSubmitterPresent && !data.submitterStudentId) {
      return NextResponse.json(
        { error: 'Submitter Student ID is required when registered student is not physically present.' },
        { status: 400 }
      );
    }

    const result = await registerLaptop({
      studentId: data.studentId,
      batch: data.batch,
      studentName: data.studentName,
      phoneNumber: data.phoneNumber,
      isSubmitterPresent: data.isSubmitterPresent,
      submitterStudentId: data.submitterStudentId,
      collectorId: user.id,
      idempotencyKey: data.idempotencyKey,
      allowDuplicateOverride: data.allowDuplicateOverride,
      duplicateReason: data.duplicateReason,
      directToBackup: data.directToBackup,
      backupReason: data.backupReason,
      branch: data.branch,
    });

    if (!result.success && result.duplicateWarning) {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to register laptop' }, { status: 400 });
  }
}
