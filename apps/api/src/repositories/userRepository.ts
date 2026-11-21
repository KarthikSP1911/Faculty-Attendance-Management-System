import { prisma } from '../db';

const withFaculty = {
  faculty: { select: { id: true, departmentId: true, status: true, fullName: true, employeeId: true } },
};

export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email }, include: withFaculty }),
  findById: (id: string) => prisma.user.findUnique({ where: { id }, include: withFaculty }),
  updateLoginState: (id: string, data: { failedLoginAttempts: number; lockedUntil: Date | null }) =>
    prisma.user.update({ where: { id }, data }),
  updatePassword: (id: string, passwordHash: string) =>
    prisma.user.update({ where: { id }, data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null } }),
};
