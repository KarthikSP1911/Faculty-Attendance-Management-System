import path from 'node:path';

// SYNTHETIC demo accounts from apps/api/prisma/seed.ts.
export const ACCOUNTS = {
  admin: { email: 'admin@fams.test', password: 'Demo@1234' },
  hod: { email: 'hod.cse@fams.test', password: 'Demo@1234' },
  faculty: { email: 'cse.faculty1@fams.test', password: 'Demo@1234' },
} as const;

export type Role = keyof typeof ACCOUNTS;
export const authFile = (role: Role) => path.join(__dirname, '..', '.auth', `${role}.json`);
