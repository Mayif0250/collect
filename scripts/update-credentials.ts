import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';
import { Role, Department } from '@prisma/client';

async function main() {
  console.log('Connecting to database and updating user accounts...');

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, name: true, isActive: true },
  });
  console.log('Existing users in database:', users);

  // 1. Admin: admin / admin123
  const adminHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminHash,
      role: Role.ADMIN,
      permittedDepartment: Department.ALL,
      isActive: true,
    },
    create: {
      name: 'System Administrator',
      username: 'admin',
      passwordHash: adminHash,
      role: Role.ADMIN,
      permittedDepartment: Department.ALL,
      isActive: true,
    },
  });
  console.log(`Updated Admin user: ${adminUser.username} (password: admin123)`);

  // 2. 13 CSE Collectors: cse_collector1..13 / cse123
  const cseHash = await bcrypt.hash('cse123', 10);
  for (let i = 1; i <= 13; i++) {
    const username = `cse_collector${i}`;
    await prisma.user.upsert({
      where: { username },
      update: {
        name: `CSE Collector ${i}`,
        passwordHash: cseHash,
        role: Role.CSE_COLLECTOR,
        permittedDepartment: Department.CSE,
        isActive: true,
      },
      create: {
        name: `CSE Collector ${i}`,
        username,
        passwordHash: cseHash,
        role: Role.CSE_COLLECTOR,
        permittedDepartment: Department.CSE,
        isActive: true,
      },
    });
  }
  console.log('Updated 13 CSE Collectors: cse_collector1 through cse_collector13 (password: cse123)');

  // 3. 5 ECE Collectors: ece_collector1..5 / ece123
  const eceHash = await bcrypt.hash('ece123', 10);
  for (let i = 1; i <= 5; i++) {
    const username = `ece_collector${i}`;
    await prisma.user.upsert({
      where: { username },
      update: {
        name: `ECE Collector ${i}`,
        passwordHash: eceHash,
        role: Role.ECE_COLLECTOR,
        permittedDepartment: Department.ECE,
        isActive: true,
      },
      create: {
        name: `ECE Collector ${i}`,
        username,
        passwordHash: eceHash,
        role: Role.ECE_COLLECTOR,
        permittedDepartment: Department.ECE,
        isActive: true,
      },
    });
  }
  console.log('Updated 5 ECE Collectors: ece_collector1 through ece_collector5 (password: ece123)');

  // Primary base aliases
  await prisma.user.upsert({
    where: { username: 'cse_collector' },
    update: { passwordHash: cseHash, role: Role.CSE_COLLECTOR, permittedDepartment: Department.CSE, isActive: true },
    create: { name: 'CSE Collector', username: 'cse_collector', passwordHash: cseHash, role: Role.CSE_COLLECTOR, permittedDepartment: Department.CSE, isActive: true },
  });

  await prisma.user.upsert({
    where: { username: 'ece_collector' },
    update: { passwordHash: eceHash, role: Role.ECE_COLLECTOR, permittedDepartment: Department.ECE, isActive: true },
    create: { name: 'ECE Collector', username: 'ece_collector', passwordHash: eceHash, role: Role.ECE_COLLECTOR, permittedDepartment: Department.ECE, isActive: true },
  });

  console.log('Credential update completed successfully for all 18 collectors!');
}

main()
  .catch((e) => {
    console.error('Error updating credentials:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
