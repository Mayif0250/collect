import { PrismaClient, Block, Role, Department } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/laptop_collect?sslmode=disable';
const isLocal = connectionString.includes('127.0.0.1') || connectionString.includes('localhost');

const pool = new Pool({
  connectionString,
  ssl: !isLocal && process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

export async function seedDatabase() {
  console.log('--- Starting Database Seeding ---');

  // 1. Seed Rooms
  console.log('Seeding E Block rooms (CSE primary)...');
  for (const r of E_BLOCK_ROOMS) {
    await prisma.room.upsert({
      where: { name: r.name },
      update: {
        block: Block.E,
        roomOrder: r.order,
        capacity: r.capacity,
        isActive: true,
      },
      create: {
        block: Block.E,
        name: r.name,
        roomOrder: r.order,
        capacity: r.capacity,
        isActive: true,
      },
    });
  }

  console.log('Seeding F Block rooms (ECE primary)...');
  for (const r of F_BLOCK_ROOMS) {
    await prisma.room.upsert({
      where: { name: r.name },
      update: {
        block: Block.F,
        roomOrder: r.order,
        capacity: r.capacity,
        isActive: true,
      },
      create: {
        block: Block.F,
        name: r.name,
        roomOrder: r.order,
        capacity: r.capacity,
        isActive: true,
      },
    });
  }

  console.log('Seeding Backup room...');
  await prisma.room.upsert({
    where: { name: 'Backup' },
    update: {
      block: Block.E,
      roomOrder: 99,
      capacity: 500,
      isActive: true,
    },
    create: {
      name: 'Backup',
      block: Block.E,
      roomOrder: 99,
      capacity: 500,
      isActive: true,
    },
  });

  // Verify counts
  const eRooms = await prisma.room.findMany({ where: { block: Block.E }, orderBy: { roomOrder: 'asc' } });
  const fRooms = await prisma.room.findMany({ where: { block: Block.F }, orderBy: { roomOrder: 'asc' } });
  const eCapacity = eRooms.reduce((sum, r) => sum + r.capacity, 0);
  const fCapacity = fRooms.reduce((sum, r) => sum + r.capacity, 0);

  console.log(`E Block Rooms: ${eRooms.length}, Total Capacity: ${eCapacity}`);
  console.log(`F Block Rooms: ${fRooms.length}, Total Capacity: ${fCapacity}`);
  console.log(`Combined Capacity: ${eCapacity + fCapacity}`);

  if (eCapacity !== 420) {
    throw new Error(`E Block capacity must be 420, got ${eCapacity}`);
  }
  if (fCapacity !== 141) {
    throw new Error(`F Block capacity must be 141, got ${fCapacity}`);
  }

  // 2. Seed Initial Administrator
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      name: adminName,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      permittedDepartment: Department.ALL,
      isActive: true,
    },
    create: {
      name: adminName,
      username: adminUsername,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      permittedDepartment: Department.ALL,
      isActive: true,
    },
  });
  console.log(`Admin user seeded: ${adminUser.username} (${adminUser.name})`);

  // 3. Seed Default Collectors for operation (18 total: 13 CSE and 5 ECE)
  const cseCollectorPasswordHash = await bcrypt.hash('cse123', 10);
  const eceCollectorPasswordHash = await bcrypt.hash('ece123', 10);

  // 13 CSE Collectors (cse_collector1 to cse_collector13)
  for (let i = 1; i <= 13; i++) {
    const username = `cse_collector${i}`;
    const name = `CSE Collector ${i}`;
    await prisma.user.upsert({
      where: { username },
      update: {
        name,
        passwordHash: cseCollectorPasswordHash,
        role: Role.CSE_COLLECTOR,
        permittedDepartment: Department.CSE,
        isActive: true,
      },
      create: {
        name,
        username,
        passwordHash: cseCollectorPasswordHash,
        role: Role.CSE_COLLECTOR,
        permittedDepartment: Department.CSE,
        isActive: true,
      },
    });
  }
  console.log('Seeded 13 CSE collectors (cse_collector1 through cse_collector13)');

  // 5 ECE Collectors (ece_collector1 to ece_collector5)
  for (let i = 1; i <= 5; i++) {
    const username = `ece_collector${i}`;
    const name = `ECE Collector ${i}`;
    await prisma.user.upsert({
      where: { username },
      update: {
        name,
        passwordHash: eceCollectorPasswordHash,
        role: Role.ECE_COLLECTOR,
        permittedDepartment: Department.ECE,
        isActive: true,
      },
      create: {
        name,
        username,
        passwordHash: eceCollectorPasswordHash,
        role: Role.ECE_COLLECTOR,
        permittedDepartment: Department.ECE,
        isActive: true,
      },
    });
  }
  console.log('Seeded 5 ECE collectors (ece_collector1 through ece_collector5)');

  // Legacy / Fallback alias collectors
  await prisma.user.upsert({
    where: { username: 'cse_collector' },
    update: {
      name: 'CSE Collector (Primary)',
      passwordHash: cseCollectorPasswordHash,
      role: Role.CSE_COLLECTOR,
      permittedDepartment: Department.CSE,
      isActive: true,
    },
    create: {
      name: 'CSE Collector (Primary)',
      username: 'cse_collector',
      passwordHash: cseCollectorPasswordHash,
      role: Role.CSE_COLLECTOR,
      permittedDepartment: Department.CSE,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'ece_collector' },
    update: {
      name: 'ECE Collector (Primary)',
      passwordHash: eceCollectorPasswordHash,
      role: Role.ECE_COLLECTOR,
      permittedDepartment: Department.ECE,
      isActive: true,
    },
    create: {
      name: 'ECE Collector (Primary)',
      username: 'ece_collector',
      passwordHash: eceCollectorPasswordHash,
      role: Role.ECE_COLLECTOR,
      permittedDepartment: Department.ECE,
      isActive: true,
    },
  });
  console.log('Base collector aliases verified.');

  // 4. Default Session
  const existingSession = await prisma.collectionSession.findFirst();
  if (!existingSession) {
    await prisma.collectionSession.create({
      data: {
        sessionName: 'Annual College Laptop Collection',
        isActive: true,
        initializedBy: adminUser.id,
        activatedAt: new Date(),
      },
    });
    console.log('Collection session initialized and activated.');
  } else {
    console.log('Collection session already exists, active status:', existingSession.isActive);
  }

  console.log('--- Database Seeding Complete ---');
}

if (require.main === module) {
  seedDatabase()
    .catch((err) => {
      console.error('Error during database seed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
