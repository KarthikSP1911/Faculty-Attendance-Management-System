import { prisma } from '../db';
import { AppError } from '../utils/errors';

export const shiftService = {
  list: () => prisma.shift.findMany({ orderBy: { name: 'asc' } }),

  async update(id: string, data: { name: string; startTime: string; endTime: string; workingDays: number[] }) {
    const before = await prisma.shift.findUnique({ where: { id } });
    if (!before) throw new AppError(404, 'SHIFT_NOT_FOUND', 'Shift not found');
    const after = await prisma.shift.update({ where: { id }, data: { ...data, workingDays: [...data.workingDays].sort() } });
    return { before, after };
  },

  async getRules() {
    return (await prisma.attendanceRule.findFirst()) ?? (await prisma.attendanceRule.create({ data: {} }));
  },

  async setGrace(graceMinutes: number) {
    const before = await shiftService.getRules();
    const after = await prisma.attendanceRule.update({ where: { id: before.id }, data: { graceMinutes } });
    return { before, after };
  },
};
