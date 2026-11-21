import type { HolidayType } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../utils/errors';
import { formatDateOnly, toDateOnly } from '../utils/dates';
import { isUniqueViolation } from '../utils/prismaErrors';

type Row = { id: string; date: Date; name: string; type: HolidayType };
const shape = (h: Row) => ({ id: h.id, date: formatDateOnly(h.date), name: h.name, type: h.type });

async function getOrThrow(id: string) {
  const h = await prisma.holiday.findUnique({ where: { id } });
  if (!h) throw new AppError(404, 'HOLIDAY_NOT_FOUND', 'Holiday not found');
  return h;
}
const duplicate = () => new AppError(409, 'HOLIDAY_EXISTS', 'A holiday already exists on this date');

export const holidayService = {
  async list(year?: number, month?: number) {
    let range: { gte: Date; lt: Date } | undefined;
    if (year && month) range = { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) };
    else if (year) range = { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
    const rows = await prisma.holiday.findMany({ where: range ? { date: range } : {}, orderBy: { date: 'asc' } });
    return rows.map(shape);
  },

  async create(data: { date: string; name: string; type: HolidayType }) {
    try {
      return shape(await prisma.holiday.create({ data: { ...data, date: toDateOnly(data.date) } }));
    } catch (e) {
      if (isUniqueViolation(e)) throw duplicate();
      throw e;
    }
  },

  async update(id: string, data: { date: string; name: string; type: HolidayType }) {
    const before = shape(await getOrThrow(id));
    try {
      return { before, after: shape(await prisma.holiday.update({ where: { id }, data: { ...data, date: toDateOnly(data.date) } })) };
    } catch (e) {
      if (isUniqueViolation(e)) throw duplicate();
      throw e;
    }
  },

  async remove(id: string) {
    const before = shape(await getOrThrow(id));
    await prisma.holiday.delete({ where: { id } });
    return before;
  },
};
