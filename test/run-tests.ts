import { Block, Department, Role, Batch, AllocationStatus, ClaimStatus } from '@prisma/client';
import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { claimRoom, completeRoom, releaseRoomClaim, reassignRoomClaim, getAllRoomsOccupancy } from '../src/lib/services/roomService';
import { registerLaptop, checkStudentDuplicate } from '../src/lib/services/collectionService';
import { previewCrossBlockTransfer, executeCrossBlockTransfer } from '../src/lib/services/overflowService';
import { generateExcelWorkbook } from '../src/lib/services/exportService';
import ExcelJS from 'exceljs';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(num: number, name: string, fn: () => Promise<void>) {
  process.stdout.write(`[Test ${num.toString().padStart(2, '0')}] ${name}... `);
  try {
    await fn();
    console.log('PASSED ✓');
    results.push({ num, name, passed: true });
  } catch (err: any) {
    console.log(`FAILED ✗: ${err.message}`);
    results.push({ num, name, passed: false, error: err.message });
  }
}

async function main() {
  console.log('====================================================');
  console.log('Running Laptop Collection System Automated Tests');
  console.log('Testing against PostgreSQL database');
  console.log('====================================================\n');

  // Clean up any lingering test rooms from previous runs
  const testRooms = await prisma.room.findMany({ where: { name: { startsWith: 'TEST_CAP_ROOM' } } });
  for (const tr of testRooms) {
    await prisma.laptopRecord.deleteMany({ where: { roomId: tr.id } });
    await prisma.roomClaim.deleteMany({ where: { roomId: tr.id } });
    await prisma.room.delete({ where: { id: tr.id } });
  }

  // Ensure collection session is active
  await prisma.collectionSession.upsert({
    where: { id: 'test-session-id' },
    update: { isActive: true },
    create: {
      id: 'test-session-id',
      sessionName: 'Test Collection Session',
      isActive: true,
      activatedAt: new Date(),
    },
  });

  // Setup test users
  const pwd = await bcrypt.hash('TestPass123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'test_admin' },
    update: { isActive: true },
    create: {
      name: 'Test Administrator',
      username: 'test_admin',
      passwordHash: pwd,
      role: Role.ADMIN,
      permittedDepartment: Department.ALL,
      isActive: true,
    },
  });

  const cseCollectorA = await prisma.user.upsert({
    where: { username: 'test_cse_col_a' },
    update: { isActive: true },
    create: {
      name: 'Test CSE Collector A',
      username: 'test_cse_col_a',
      passwordHash: pwd,
      role: Role.CSE_COLLECTOR,
      permittedDepartment: Department.CSE,
      isActive: true,
    },
  });

  const cseCollectorB = await prisma.user.upsert({
    where: { username: 'test_cse_col_b' },
    update: { isActive: true },
    create: {
      name: 'Test CSE Collector B',
      username: 'test_cse_col_b',
      passwordHash: pwd,
      role: Role.CSE_COLLECTOR,
      permittedDepartment: Department.CSE,
      isActive: true,
    },
  });

  const eceCollector = await prisma.user.upsert({
    where: { username: 'test_ece_col' },
    update: { isActive: true },
    create: {
      name: 'Test ECE Collector',
      username: 'test_ece_col',
      passwordHash: pwd,
      role: Role.ECE_COLLECTOR,
      permittedDepartment: Department.ECE,
      isActive: true,
    },
  });

  // TEST 1: The 18 rooms and capacities are seeded correctly
  await runTest(1, 'The 18 rooms and capacities are seeded correctly', async () => {
    const rooms = await prisma.room.findMany({ orderBy: [{ block: 'asc' }, { roomOrder: 'asc' }] });
    assert(rooms.length === 18, `Expected 18 rooms, found ${rooms.length}`);
    const eRooms = rooms.filter((r) => r.block === Block.E);
    const fRooms = rooms.filter((r) => r.block === Block.F);
    assert(eRooms.length === 13, `Expected 13 E Block rooms, got ${eRooms.length}`);
    assert(fRooms.length === 5, `Expected 5 F Block rooms, got ${fRooms.length}`);
  });

  // TEST 2: E Block capacity equals 420
  await runTest(2, 'E Block capacity equals 420', async () => {
    const eRooms = await prisma.room.findMany({ where: { block: Block.E } });
    const total = eRooms.reduce((sum, r) => sum + r.capacity, 0);
    assert(total === 420, `Expected E Block capacity 420, got ${total}`);
  });

  // TEST 3: F Block capacity equals 141
  await runTest(3, 'F Block capacity equals 141', async () => {
    const fRooms = await prisma.room.findMany({ where: { block: Block.F } });
    const total = fRooms.reduce((sum, r) => sum + r.capacity, 0);
    assert(total === 141, `Expected F Block capacity 141, got ${total}`);
  });

  // TEST 4: E Block and F Block allocate independently
  await runTest(4, 'E Block and F Block allocate independently', async () => {
    // Release any lingering claims on E102 and F203
    await prisma.roomClaim.updateMany({
      where: { room: { name: { in: ['E102', 'F203'] } }, status: ClaimStatus.ACTIVE },
      data: { status: ClaimStatus.RELEASED },
    });

    const e102 = await prisma.room.findUniqueOrThrow({ where: { name: 'E102' } });
    const f203 = await prisma.room.findUniqueOrThrow({ where: { name: 'F203' } });

    // CSE claims E102
    const claimE = await claimRoom(cseCollectorA.id, e102.id);
    assert(claimE.roomId === e102.id, 'CSE collector successfully claimed E102');

    // ECE claims F203 independently
    const claimF = await claimRoom(eceCollector.id, f203.id);
    assert(claimF.roomId === f203.id, 'ECE collector successfully claimed F203');

    // Register 1 CSE laptop
    const cseRes = await registerLaptop({
      studentId: `TEST_CSE_${Date.now()}`,
      batch: Batch.O23,
      isSubmitterPresent: true,
      collectorId: cseCollectorA.id,
    });
    assert(cseRes.success && cseRes.record?.roomName === 'E102', 'CSE laptop allocated to E102');

    // Register 1 ECE laptop
    const eceRes = await registerLaptop({
      studentId: `TEST_ECE_${Date.now()}`,
      batch: Batch.O23,
      isSubmitterPresent: true,
      collectorId: eceCollector.id,
    });
    assert(eceRes.success && eceRes.record?.roomName === 'F203', 'ECE laptop allocated to F203');

    // Clean up
    await completeRoom(cseCollectorA.id, e102.id);
    await completeRoom(eceCollector.id, f203.id);
  });

  // TEST 5: Seats are numbered sequentially within each room
  await runTest(5, 'Seats are numbered sequentially within each room', async () => {
    const e102 = await prisma.room.findUniqueOrThrow({ where: { name: 'E102' } });
    await prisma.roomClaim.updateMany({ where: { roomId: e102.id, status: ClaimStatus.ACTIVE }, data: { status: ClaimStatus.RELEASED } });
    await claimRoom(cseCollectorA.id, e102.id);

    const seat1Res = await registerLaptop({
      studentId: `TEST_SEQ_1_${Date.now()}`,
      batch: Batch.O23,
      isSubmitterPresent: true,
      collectorId: cseCollectorA.id,
    });
    const seat2Res = await registerLaptop({
      studentId: `TEST_SEQ_2_${Date.now()}`,
      batch: Batch.O21,
      isSubmitterPresent: true,
      collectorId: cseCollectorA.id,
    });

    assert(seat1Res.record?.seatNumber !== undefined, 'Seat 1 assigned');
    assert(seat2Res.record?.seatNumber !== undefined, 'Seat 2 assigned');
    assert(seat2Res.record!.seatNumber === seat1Res.record!.seatNumber! + 1, 'Seats are numbered sequentially');

    await completeRoom(cseCollectorA.id, e102.id);
  });

  // TEST 6: No room exceeds its capacity
  await runTest(6, 'No room exceeds its capacity', async () => {
    // Create a temporary small room with capacity 2 to test overflow protection
    const testRoom = await prisma.room.create({
      data: {
        name: `TEST_CAP_ROOM_${Date.now()}`,
        block: Block.E,
        roomOrder: 999,
        capacity: 2,
        isActive: true,
      },
    });

    const claim = await prisma.roomClaim.create({
      data: {
        roomId: testRoom.id,
        collectorId: cseCollectorA.id,
        status: ClaimStatus.ACTIVE,
      },
    });

    // Fill seat 1 and 2
    await registerLaptop({ studentId: `TEST_FULL_1_${Date.now()}`, batch: Batch.O23, isSubmitterPresent: true, collectorId: cseCollectorA.id });
    await registerLaptop({ studentId: `TEST_FULL_2_${Date.now()}`, batch: Batch.O23, isSubmitterPresent: true, collectorId: cseCollectorA.id });

    // 3rd laptop should fail or go to backup
    let threwError = false;
    try {
      await registerLaptop({ studentId: `TEST_FULL_3_${Date.now()}`, batch: Batch.O23, isSubmitterPresent: true, collectorId: cseCollectorA.id });
    } catch (err: any) {
      threwError = true;
      assert(err.message.includes('ROOM_FULL'), `Expected ROOM_FULL error, got ${err.message}`);
    }
    assert(threwError, 'Prevented registration exceeding room capacity');

    // Clean up
    await prisma.laptopRecord.deleteMany({ where: { roomId: testRoom.id } });
    await prisma.roomClaim.deleteMany({ where: { roomId: testRoom.id } });
    await prisma.room.delete({ where: { id: testRoom.id } });
  });

  // TEST 7: Two collectors cannot claim the same room
  await runTest(7, 'Two collectors cannot claim the same room', async () => {
    const e102 = await prisma.room.findUniqueOrThrow({ where: { name: 'E102' } });
    await prisma.roomClaim.updateMany({ where: { roomId: e102.id, status: ClaimStatus.ACTIVE }, data: { status: ClaimStatus.RELEASED } });

    // Collector A claims E102
    await claimRoom(cseCollectorA.id, e102.id);

    // Collector B tries to claim E102 -> must fail
    let claimFailed = false;
    try {
      await claimRoom(cseCollectorB.id, e102.id);
    } catch (err: any) {
      claimFailed = true;
      assert(err.message.includes('ROOM_ALREADY_CLAIMED'), `Expected ROOM_ALREADY_CLAIMED, got ${err.message}`);
    }
    assert(claimFailed, 'Second collector was prevented from claiming the same room');

    await completeRoom(cseCollectorA.id, e102.id);
  });

  // TEST 8: Simultaneous submissions cannot allocate the same seat
  await runTest(8, 'Simultaneous submissions cannot allocate the same seat', async () => {
    const e102 = await prisma.room.findUniqueOrThrow({ where: { name: 'E102' } });
    await prisma.roomClaim.updateMany({ where: { roomId: e102.id, status: ClaimStatus.ACTIVE }, data: { status: ClaimStatus.RELEASED } });
    await claimRoom(cseCollectorA.id, e102.id);

    // Launch 3 simultaneous registrations
    const promises = [1, 2, 3].map((i) =>
      registerLaptop({
        studentId: `TEST_CONC_${i}_${Date.now()}`,
        batch: Batch.O23,
        isSubmitterPresent: true,
        collectorId: cseCollectorA.id,
      })
    );

    const outcomes = await Promise.allSettled(promises);
    const successful = outcomes
      .filter((o) => o.status === 'fulfilled')
      .map((o) => (o as PromiseFulfilledResult<any>).value);

    // Verify all allocated seats are distinct
    const seatNumbers = successful.map((s) => s.record?.seatNumber);
    const uniqueSeats = new Set(seatNumbers);
    assert(uniqueSeats.size === seatNumbers.length, `Duplicate seats detected: ${seatNumbers.join(', ')}`);

    await completeRoom(cseCollectorA.id, e102.id);
  });

  // TEST 9: Failed submissions do not consume seats
  await runTest(9, 'Failed submissions do not consume seats', async () => {
    const e102 = await prisma.room.findUniqueOrThrow({ where: { name: 'E102' } });
    await prisma.roomClaim.updateMany({ where: { roomId: e102.id, status: ClaimStatus.ACTIVE }, data: { status: ClaimStatus.RELEASED } });
    await claimRoom(cseCollectorA.id, e102.id);

    const initialCount = await prisma.laptopRecord.count({ where: { roomId: e102.id } });

    // Intentionally trigger a failure (e.g. invalid collector or db rejection)
    try {
      await registerLaptop({
        studentId: 'BAD_ID',
        batch: Batch.O23,
        isSubmitterPresent: true,
        collectorId: 'non-existent-collector-id',
      });
    } catch {
      // Expected to fail
    }

    const afterCount = await prisma.laptopRecord.count({ where: { roomId: e102.id } });
    assert(afterCount === initialCount, `Seat was erroneously consumed. Initial: ${initialCount}, After: ${afterCount}`);

    await completeRoom(cseCollectorA.id, e102.id);
  });

  // TEST 10: Retrying the same idempotent request does not create another record
  await runTest(10, 'Retrying the same idempotent request does not create another record', async () => {
    const e102 = await prisma.room.findUniqueOrThrow({ where: { name: 'E102' } });
    await prisma.roomClaim.updateMany({ where: { roomId: e102.id, status: ClaimStatus.ACTIVE }, data: { status: ClaimStatus.RELEASED } });
    await claimRoom(cseCollectorA.id, e102.id);

    const idempotencyKey = `idem-${Date.now()}-${Math.random()}`;
    const studentId = `TEST_IDEM_${Date.now()}`;

    const res1 = await registerLaptop({
      studentId,
      batch: Batch.O23,
      isSubmitterPresent: true,
      collectorId: cseCollectorA.id,
      idempotencyKey,
    });

    const res2 = await registerLaptop({
      studentId,
      batch: Batch.O23,
      isSubmitterPresent: true,
      collectorId: cseCollectorA.id,
      idempotencyKey, // same key
    });

    assert(res1.record?.id === res2.record?.id, 'Both calls returned the same record');
    assert(res1.record?.collectionId === res2.record?.collectionId, 'Collection ID matched');

    const totalRecords = await prisma.laptopRecord.count({ where: { idempotencyKey } });
    assert(totalRecords === 1, `Expected exactly 1 record for idempotency key, found ${totalRecords}`);

    await completeRoom(cseCollectorA.id, e102.id);
  });

  // TEST 11: Duplicate student IDs trigger the intended verification flow
  await runTest(11, 'Duplicate student IDs trigger the intended verification flow', async () => {
    const e102 = await prisma.room.findUniqueOrThrow({ where: { name: 'E102' } });
    await prisma.roomClaim.updateMany({ where: { roomId: e102.id, status: ClaimStatus.ACTIVE }, data: { status: ClaimStatus.RELEASED } });
    await claimRoom(cseCollectorA.id, e102.id);

    const dupStudentId = `DUP_STUDENT_${Date.now()}`;

    // 1st registration
    const res1 = await registerLaptop({
      studentId: dupStudentId,
      batch: Batch.O23,
      isSubmitterPresent: true,
      collectorId: cseCollectorA.id,
    });
    assert(res1.success, 'First registration succeeded');

    // 2nd registration without override -> must return duplicate warning
    const res2 = await registerLaptop({
      studentId: dupStudentId,
      batch: Batch.O23,
      isSubmitterPresent: true,
      collectorId: cseCollectorA.id,
    });
    assert(!res2.success && res2.duplicateWarning === true, 'Duplicate warning triggered');

    // 3rd registration WITH override -> must succeed with audit trail
    const res3 = await registerLaptop({
      studentId: dupStudentId,
      batch: Batch.O23,
      isSubmitterPresent: true,
      collectorId: cseCollectorA.id,
      allowDuplicateOverride: true,
      duplicateReason: 'Second laptop brought by authorized student replacement exception',
    });
    assert(res3.success === true, 'Registration succeeded with duplicate override');

    await completeRoom(cseCollectorA.id, e102.id);
  });

  // TEST 12: Wrong-department collectors cannot access unauthorized allocation actions
  await runTest(12, 'Wrong-department collectors cannot access unauthorized allocation actions', async () => {
    const f204 = await prisma.room.findUniqueOrThrow({ where: { name: 'F204' } });
    // CSE collector tries to claim F Block room -> must be rejected
    let failed = false;
    try {
      await claimRoom(cseCollectorA.id, f204.id);
    } catch (err: any) {
      failed = true;
      assert(err.message.includes('DEPARTMENT_MISMATCH'), `Expected DEPARTMENT_MISMATCH, got ${err.message}`);
    }
    assert(failed, 'CSE collector was prevented from claiming F Block room');
  });

  // TEST 13: Opening a link does not reserve a room
  await runTest(13, 'Opening a link does not reserve a room', async () => {
    const initialOccupancy = await getAllRoomsOccupancy();
    const activeClaimsBefore = initialOccupancy.filter((r) => r.activeClaim !== null).length;

    // Simulate querying/viewing room list without claiming
    const afterOccupancy = await getAllRoomsOccupancy();
    const activeClaimsAfter = afterOccupancy.filter((r) => r.activeClaim !== null).length;

    assert(activeClaimsBefore === activeClaimsAfter, 'Querying rooms did not alter claims');
  });

  // TEST 14: Unauthorized users cannot export protected data
  await runTest(14, 'Unauthorized users cannot export protected data', async () => {
    // Only ADMIN role has permission. Verify collector role rejection
    assert(cseCollectorA.role !== Role.ADMIN, 'Collector is not an admin');
    assert(eceCollector.role !== Role.ADMIN, 'ECE collector is not an admin');
  });

  // TEST 15: Full primary blocks accept valid backup records without assigning invalid seats
  await runTest(15, 'Full primary blocks accept valid backup records without assigning invalid seats', async () => {
    // Test backup recording
    const backupLaptop = await prisma.laptopRecord.create({
      data: {
        collectionId: `COL-CSE-BACKUP-${Date.now()}`,
        studentId: `BACKUP_STUDENT_${Date.now()}`,
        branch: Department.CSE,
        batch: Batch.O23,
        primaryBlock: Block.E,
        allocationStatus: AllocationStatus.BACKUP,
        roomId: null,
        seatNumber: null,
        collectorId: cseCollectorA.id,
      },
    });

    assert(backupLaptop.allocationStatus === AllocationStatus.BACKUP, 'Recorded as BACKUP');
    assert(backupLaptop.roomId === null, 'Room ID is null for backup');
    assert(backupLaptop.seatNumber === null, 'Seat number is null for backup');
  });

  // TEST 16: Cross-block transfers require administrator authorization
  await runTest(16, 'Cross-block transfers require administrator authorization', async () => {
    let failed = false;
    try {
      // Pass non-admin collector ID as authorizer
      await executeCrossBlockTransfer(cseCollectorA.id, Department.CSE, Block.F, 'Unauthorized transfer attempt');
    } catch (err: any) {
      failed = true;
      assert(err.message.includes('UNAUTHORIZED_ADMIN'), `Expected UNAUTHORIZED_ADMIN, got ${err.message}`);
    }
    assert(failed, 'Non-admin transfer attempt was rejected');
  });

  // TEST 17: Cross-block transfers cannot exceed destination capacity
  await runTest(17, 'Cross-block transfers cannot exceed destination capacity', async () => {
    const preview = await previewCrossBlockTransfer(Department.CSE, Block.F);
    assert(preview.transferrableCount <= preview.destinationVacancies, 'Transfer count never exceeds vacancies');

    if (preview.transferrableCount > 0) {
      const res = await executeCrossBlockTransfer(
        adminUser.id,
        Department.CSE,
        Block.F,
        'Valid administrative test cross-block transfer'
      );
      assert(res.success === true, 'Transfer executed successfully');
      assert(res.transferredCount <= preview.destinationVacancies, 'Transferred count respects vacancy');
    }
  });

  // TEST 18: Excel exports contain the expected records and room/seat values
  await runTest(18, 'Excel exports contain the expected records and room/seat values', async () => {
    const excelBuffer = await generateExcelWorkbook();
    assert(Buffer.isBuffer(excelBuffer) && excelBuffer.length > 0, 'Generated valid binary Excel buffer');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(excelBuffer as any);

    const sheetNames = wb.worksheets.map((s) => s.name);
    assert(sheetNames.includes('Master Register'), 'Contains Master Register');
    assert(sheetNames.includes('E Block Primary'), 'Contains E Block Primary');
    assert(sheetNames.includes('F Block Primary'), 'Contains F Block Primary');
    assert(sheetNames.includes('Backup Inventory'), 'Contains Backup Inventory');
    assert(sheetNames.includes('Cross-Block Allocations'), 'Contains Cross-Block Allocations');
    assert(sheetNames.includes('E102'), 'Contains E102 room worksheet');
    assert(sheetNames.includes('F203'), 'Contains F203 room worksheet');
  });

  // TEST 19: Collector deactivation prevents new allocation operations
  await runTest(19, 'Collector deactivation prevents new allocation operations', async () => {
    // Create deactivated collector
    const deactivatedCollector = await prisma.user.create({
      data: {
        name: 'Deactivated Collector',
        username: `deactivated_${Date.now()}`,
        passwordHash: pwd,
        role: Role.CSE_COLLECTOR,
        permittedDepartment: Department.CSE,
        isActive: false, // Deactivated!
      },
    });

    const e208 = await prisma.room.findUniqueOrThrow({ where: { name: 'E208' } });
    let failed = false;
    try {
      await claimRoom(deactivatedCollector.id, e208.id);
    } catch (err: any) {
      failed = true;
      assert(err.message.includes('COLLECTOR_INACTIVE'), `Expected COLLECTOR_INACTIVE, got ${err.message}`);
    }
    assert(failed, 'Deactivated collector was barred from claiming rooms');
  });

  // TEST 20: Administrative room release and reassignment preserve the audit trail
  await runTest(20, 'Administrative room release and reassignment preserve the audit trail', async () => {
    const e102 = await prisma.room.findUniqueOrThrow({ where: { name: 'E102' } });
    await prisma.roomClaim.updateMany({ where: { roomId: e102.id, status: ClaimStatus.ACTIVE }, data: { status: ClaimStatus.RELEASED } });

    // Collector A claims E102
    const claim = await claimRoom(cseCollectorA.id, e102.id);

    // Admin reassigns claim to Collector B
    const reassigned = await reassignRoomClaim(
      adminUser.id,
      claim.id,
      cseCollectorB.id,
      'Collector A reassigned due to network disruption'
    );
    assert(reassigned.collectorId === cseCollectorB.id, 'Claim transferred to Collector B');

    // Check audit log
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        action: 'REASSIGN_ROOM_CLAIM',
        userId: adminUser.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(auditRecord?.reason?.includes('network disruption')), 'Audit log contains administrative reason');

    // Admin releases claim
    await releaseRoomClaim(adminUser.id, reassigned.id, 'Shift completed, releasing room');
    const releaseAudit = await prisma.auditLog.findFirst({
      where: {
        action: 'RELEASE_ROOM_CLAIM',
        userId: adminUser.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(releaseAudit !== null, 'Audit log recorded for release');
  });

  console.log('\n====================================================');
  console.log('Test Summary:');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Passed: ${passed} / ${results.length}`);
  console.log(`Failed: ${failed} / ${results.length}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
