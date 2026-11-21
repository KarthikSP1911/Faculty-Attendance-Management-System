import bcrypt from 'bcrypt';
import type { Role } from '@prisma/client';
import { prisma } from '../../src/db';

export const TEST_PASSWORD = 'Valid@1234';

/** Empties every table so each suite starts clean. */
export async function resetDb(): Promise<void> {
  const schema = new URL(process.env.DATABASE_URL as string).searchParams.get('schema') ?? 'public';
  if (schema === 'public') throw new Error('Refusing to truncate the public schema; use a dedicated test schema.');
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = ${schema} AND tablename <> '_prisma_migrations'`;
  const tables = rows.map((r) => `"${schema}"."${r.tablename}"`).join(', ');
  if (tables) await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

export async function createUser(opts: { email: string; role?: Role; password?: string; isActive?: boolean }) {
  return prisma.user.create({
    data: {
      email: opts.email,
      role: opts.role ?? 'FACULTY',
      isActive: opts.isActive ?? true,
      passwordHash: await bcrypt.hash(opts.password ?? TEST_PASSWORD, 4),
    },
  });
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
