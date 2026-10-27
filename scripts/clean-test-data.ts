import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, Block, Role, Department } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5433/laptop_collect?sslmode=disable';

const isLocal =
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('localhost') ||
  connectionString.includes('sslmode=disable');

const pool = new Pool({
  connectionString,
  ssl: !isLocal ? { rejectUnauthorized: false } : false,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const E_BLOCK_ROOMS: Array<{ order: number; name: string; capacity: number }> = [
  { order: 1, name: 'E102', capacity: 28 },
  { order: 2, name: 'E103', capacity: 28 },
  { order: 3, name: 'E104', capacity: 28 },
  { order: 4, name: 'E106', capacity: 28 },
  { order: 5, name: 'E107', capacity: 28 },
  { order: 6, name: 'E206', capacity: 28 },
  { order: 7, name: 'E207', capacity: 28 },
  { order: 8, name: 'E208', capacity: 28 },
  { order: 9, name: 'E209', capacity: 28 },
  { order: 10, name: 'LAB1', capacity: 42 },
  { order: 11, name: 'LAB2', capacity: 42 },
  { order: 12, name: 'LAB3', capacity: 42 },
  { order: 13, name: 'LAB4 (ENG LAB)', capacity: 42 },
];

export const F_BLOCK_ROOMS: Array<{ order: number; name: string; capacity: number }> = [
  { order: 1, name: 'F203', capacity: 28 },
  { order: 2, name: 'F204', capacity: 28 },
  { order: 3, name: 'F207', capacity: 28 },
  { order: 4, name: 'F310', capacity: 28 },
  { order: 5, name: 'F305', capacity: 29 },
];

export async function cleanTestData() {
  console.log('====================================================');
  console.log('Cleaning Test Data from Database');
  console.log('====================================================\n');

  // 1. Delete all laptop records (test records)
  const deletedLaptops = await prisma.laptopRecord.deleteMany();
  console.log(`Deleted ${deletedLaptops.count} laptop records.`);

  // 2. Delete all cross-block transfers
  const deletedTransfers = await prisma.crossBlockTransfer.deleteMany();
  console.log(`Deleted ${deletedTransfers.count} cross-block transfers.`);

  // 3. Delete all room claims (resets all rooms to unclaimed & fresh)
  const deletedClaims = await prisma.roomClaim.deleteMany();
  console.log(`Deleted ${deletedClaims.count} room claims.`);

  // 4. Delete all idempotency records
  const deletedIdempotency = await prisma.idempotencyRecord.deleteMany();
  console.log(`Deleted ${deletedIdempotency.count} idempotency records.`);

  // 5. Delete test audit logs
  const deletedAudit = await prisma.auditLog.deleteMany();
  console.log(`Deleted ${deletedAudit.count} audit logs.`);

  // 6. Delete test collection sessions
  const deletedSessions = await prisma.collectionSession.deleteMany({
    where: {
      OR: [
        { id: 'test-session-id' },
        { sessionName: { contains: 'Test', mode: 'insensitive' } },
      ],
    },
  });
  console.log(`Deleted ${deletedSessions.count} test collection session(s).`);

  // 7. Delete test rooms (any starting with TEST_)
  const deletedTestRooms = await prisma.room.deleteMany({
    where: { name: { startsWith: 'TEST' } },
  });
  console.log(`Deleted ${deletedTestRooms.count} test room(s).`);

  // 8. Delete test users (usernames starting with 'test_' or 'deactivated_')
  const deletedTestUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { username: { startsWith: 'test_' } },
        { username: { startsWith: 'deactivated_' } },
      ],
    },
  });
  console.log(`Deleted ${deletedTestUsers.count} test user(s).`);

  // 9. Verify and ensure standard 18 rooms are intact
  console.log('\nEnsuring standard 18 rooms are configured...');
  for (const r of E_BLOCK_ROOMS) {
    await prisma.room.upsert({
      where: { name: r.name },
      update: { block: Block.E, roomOrder: r.order, capacity: r.capacity, isActive: true },
      create: { block: Block.E, name: r.name, roomOrder: r.order, capacity: r.capacity, isActive: true },
    });
  }
  for (const r of F_BLOCK_ROOMS) {
    await prisma.room.upsert({
      where: { name: r.name },
      update: { block: Block.F, roomOrder: r.order, capacity: r.capacity, isActive: true },
      create: { block: Block.F, name: r.name, roomOrder: r.order, capacity: r.capacity, isActive: true },
    });
  }

  // 10. Ensure production admin user exists
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  let adminUser = await prisma.user.findUnique({ where: { username: adminUsername } });
  if (!adminUser) {
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    adminUser = await prisma.user.create({
      data: {
        name: adminName,
        username: adminUsername,
        passwordHash: adminPasswordHash,
        role: Role.ADMIN,
        permittedDepartment: Department.ALL,
        isActive: true,
      },
    });
    console.log(`Created admin user: ${adminUser.username}`);
  } else {
    // Make sure admin is active
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { isActive: true },
    });
    console.log(`Verified active admin user: ${adminUser.username}`);
  }

  // 11. Ensure default collectors exist and are active (18 total: 13 CSE and 5 ECE)
  const cseCollectorPasswordHash = await bcrypt.hash('cse123', 10);
  const eceCollectorPasswordHash = await bcrypt.hash('ece123', 10);

  // 13 CSE Collectors
  for (let i = 1; i <= 13; i++) {
    const username = `cse_collector${i}`;
    const name = `CSE Collector ${i}`;
    await prisma.user.upsert({
      where: { username },
      update: { name, passwordHash: cseCollectorPasswordHash, role: Role.CSE_COLLECTOR, permittedDepartment: Department.CSE, isActive: true },
      create: { name, username, passwordHash: cseCollectorPasswordHash, role: Role.CSE_COLLECTOR, permittedDepartment: Department.CSE, isActive: true },
    });
  }
  console.log('Verified 13 active CSE collectors (cse_collector1 through cse_collector13)');

  // 5 ECE Collectors
  for (let i = 1; i <= 5; i++) {
    const username = `ece_collector${i}`;
    const name = `ECE Collector ${i}`;
    await prisma.user.upsert({
      where: { username },
      update: { name, passwordHash: eceCollectorPasswordHash, role: Role.ECE_COLLECTOR, permittedDepartment: Department.ECE, isActive: true },
      create: { name, username, passwordHash: eceCollectorPasswordHash, role: Role.ECE_COLLECTOR, permittedDepartment: Department.ECE, isActive: true },
    });
  }
  console.log('Verified 5 active ECE collectors (ece_collector1 through ece_collector5)');

  // Base alias accounts
  await prisma.user.upsert({
    where: { username: 'cse_collector' },
    update: { name: 'CSE Collector (Primary)', passwordHash: cseCollectorPasswordHash, role: Role.CSE_COLLECTOR, permittedDepartment: Department.CSE, isActive: true },
    create: { name: 'CSE Collector (Primary)', username: 'cse_collector', passwordHash: cseCollectorPasswordHash, role: Role.CSE_COLLECTOR, permittedDepartment: Department.CSE, isActive: true },
  });

  await prisma.user.upsert({
    where: { username: 'ece_collector' },
    update: { name: 'ECE Collector (Primary)', passwordHash: eceCollectorPasswordHash, role: Role.ECE_COLLECTOR, permittedDepartment: Department.ECE, isActive: true },
    create: { name: 'ECE Collector (Primary)', username: 'ece_collector', passwordHash: eceCollectorPasswordHash, role: Role.ECE_COLLECTOR, permittedDepartment: Department.ECE, isActive: true },
  });
  console.log('Verified active base collector aliases');

  // 12. Ensure default session exists and is active
  const defaultSession = await prisma.collectionSession.findFirst({
    where: { sessionName: 'Annual College Laptop Collection' },
  });
  if (!defaultSession) {
    await prisma.collectionSession.create({
      data: {
        sessionName: 'Annual College Laptop Collection',
        isActive: true,
        initializedBy: adminUser.id,
        activatedAt: new Date(),
      },
    });
    console.log('Created active default collection session.');
  } else {
    await prisma.collectionSession.update({
      where: { id: defaultSession.id },
      data: { isActive: true },
    });
    console.log('Verified active default collection session.');
  }

  // 13. Audit log entry for database cleanup
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'DATABASE_CLEANUP',
      entityType: 'System',
      entityId: null,
      reason: 'Removed all automated and manual test data from database; reset collection state to clean initial state',
    },
  });

  // 14. Print final database status
  console.log('\n====================================================');
  console.log('Final Database Counts:');
  console.log('====================================================');
  const counts = {
    users: await prisma.user.count(),
    rooms: await prisma.room.count(),
    claims: await prisma.roomClaim.count(),
    laptops: await prisma.laptopRecord.count(),
    transfers: await prisma.crossBlockTransfer.count(),
    sessions: await prisma.collectionSession.count(),
    auditLogs: await prisma.auditLog.count(),
    idempotencyRecords: await prisma.idempotencyRecord.count(),
  };
  console.table(counts);

  const activeUsers = await prisma.user.findMany({
    select: { username: true, name: true, role: true, isActive: true },
  });
  console.log('Active Users:', activeUsers);

  console.log('\nDatabase cleanup finished successfully!');
}

if (require.main === module) {
  cleanTestData()
    .catch((err) => {
      console.error('Error during cleanup:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
