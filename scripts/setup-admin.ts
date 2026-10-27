import readline from 'readline';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Role, Department } from '@prisma/client';
import prisma from '../src/lib/prisma';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string, defaultValue = ''): Promise<string> {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  console.log('=== One-Time Secure Administrator Setup ===\n');

  const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
  const defaultName = process.env.ADMIN_NAME || 'System Administrator';

  const username = await ask('Admin Username', defaultUsername);
  const name = await ask('Admin Full Name', defaultName);
  let password = process.env.ADMIN_PASSWORD;

  if (!password) {
    password = await ask('Admin Password (min 8 chars)');
  } else {
    const useEnv = await ask('Use ADMIN_PASSWORD from .env? (y/n)', 'y');
    if (useEnv.toLowerCase() !== 'y') {
      password = await ask('Enter New Admin Password');
    }
  }

  if (!password || password.length < 8) {
    console.error('\nError: Password must be at least 8 characters long.');
    process.exit(1);
  }

  console.log('\nHashing credentials and updating database...');
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      name,
      passwordHash,
      role: Role.ADMIN,
      permittedDepartment: Department.ALL,
      isActive: true,
    },
    create: {
      name,
      username,
      passwordHash,
      role: Role.ADMIN,
      permittedDepartment: Department.ALL,
      isActive: true,
    },
  });

  // Also log audit record
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'ADMIN_SETUP_CLI',
      entityType: 'User',
      entityId: admin.id,
      newValue: { username, name, role: Role.ADMIN },
      reason: 'Administrator account configured via CLI setup tool',
    },
  });

  console.log(`\nSuccess! Admin account "${admin.username}" is ready.`);
  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nSetup error:', err);
  rl.close();
  process.exit(1);
});
