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

  // 2. CSE Collector: cse_collector / cse123
  const cseHash = await bcrypt.hash('cse123', 10);
  const cseUser = await prisma.user.upsert({
    where: { username: 'cse_collector' },
    update: {
      passwordHash: cseHash,
      role: Role.CSE_COLLECTOR,
      permittedDepartment: Department.CSE,
      isActive: true,
    },
    create: {
      name: 'CSE Collector',
      username: 'cse_collector',
      passwordHash: cseHash,
      role: Role.CSE_COLLECTOR,
      permittedDepartment: Department.CSE,
      isActive: true,
    },
  });
  console.log(`Updated CSE Collector: ${cseUser.username} (password: cse123)`);

  // 3. ECE Collector: ece_collector / ece123
  const eceHash = await bcrypt.hash('ece123', 10);
  const eceUser = await prisma.user.upsert({
    where: { username: 'ece_collector' },
    update: {
      passwordHash: eceHash,
      role: Role.ECE_COLLECTOR,
      permittedDepartment: Department.ECE,
      isActive: true,
    },
    create: {
      name: 'ECE Collector',
      username: 'ece_collector',
      passwordHash: eceHash,
      role: Role.ECE_COLLECTOR,
      permittedDepartment: Department.ECE,
      isActive: true,
    },
  });
  console.log(`Updated ECE Collector: ${eceUser.username} (password: ece123)`);

  // If old accounts cse_collector_1 or ece_collector_1 exist, update their passwords too or sync them
  const oldCse = await prisma.user.findUnique({ where: { username: 'cse_collector_1' } });
  if (oldCse) {
    await prisma.user.update({
      where: { username: 'cse_collector_1' },
      data: { passwordHash: cseHash },
    });
    console.log('Also updated cse_collector_1 password to cse123');
  }

  const oldEce = await prisma.user.findUnique({ where: { username: 'ece_collector_1' } });
  if (oldEce) {
    await prisma.user.update({
      where: { username: 'ece_collector_1' },
      data: { passwordHash: eceHash },
    });
    console.log('Also updated ece_collector_1 password to ece123');
  }

  console.log('Credential update completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error updating credentials:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
