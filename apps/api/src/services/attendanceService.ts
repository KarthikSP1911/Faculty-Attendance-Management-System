import type { AttendanceRecord, AttendanceRule } from '@prisma/client';
import { prisma } from '../db';
import { clock } from '../utils/clock';
import { formatDateOnly, isoWeekday, istDate, monthOf, todayIST, toDateOnly } from '../utils/dates';
import { AppError } from '../utils/errors';
import { isUniqueViolation } from '../utils/prismaErrors';
import {
  checkInWindow,
  checkOutWindow,
  computeDailyStatus,
  isLateDeduction,
  type DayType,
  type LeaveKind,
  type RuleSet,
} from './attendanceRules';

export const shapeRecord = (r: AttendanceRecord) => ({
  id: r.id,
  date: formatDateOnly(r.date),
  checkInAt: r.checkInAt,
  checkOutAt: r.checkOutAt,
  workedMinutes: r.workedMinutes,
  status: r.status,
  regularized: r.regularized,
  lateDeduction: r.lateDeduction,
});

export async function getRules(): Promise<AttendanceRule> {
  const rules = await prisma.attendanceRule.findFirst();
  if (!rules) throw new AppError(409, 'NO_RULES', 'Attendance rules are not configured');
  return rules;
}

/** What kind of day is `date` for a person on this shift: working, holiday or weekly off. */
export async function resolveDay(
  facultyId: string,
  workingDays: number[],
  date: string,
): Promise<{ dayType: DayType; leave: LeaveKind; holidayName?: string }> {
  const day = toDateOnly(date);
  const [holiday, leave] = await Promise.all([
    prisma.holiday.findUnique({ where: { date: day } }),
    prisma.leaveRequest.findFirst({
      where: { facultyId, status: 'APPROVED', startDate: { lte: day }, endDate: { gte: day } },
      select: { halfDay: true },
    }),
  ]);
  const leaveKind: LeaveKind = leave ? (leave.halfDay === 'NONE' ? 'FULL' : 'HALF') : null;
  if (holiday) return { dayType: 'HOLIDAY', leave: leaveKind, holidayName: holiday.name };
  if (!workingDays.includes(isoWeekday(date))) return { dayType: 'WEEKLY_OFF', leave: leaveKind };
  return { dayType: 'WORKING', leave: leaveKind };
}

async function loadFaculty(facultyId: string | null) {
  if (!facultyId) throw new AppError(403, 'NO_FACULTY_PROFILE', 'This account has no faculty profile');
  const faculty = await prisma.faculty.findUnique({ where: { id: facultyId }, include: { shift: true } });
  if (!faculty) throw new AppError(404, 'FACULTY_NOT_FOUND', 'Faculty not found');
  return faculty;
}

/** Number of Late days earlier in the same month (excluding `date` itself). */
async function lateDaysBefore(facultyId: string, date: string): Promise<number> {
  const start = toDateOnly(`${monthOf(date)}-01`);
  return prisma.attendanceRecord.count({
    where: { facultyId, status: 'LATE', date: { gte: start, lt: toDateOnly(date) } },
  });
}

/** Recomputes status, worked minutes and late deduction for a record from its punches. */
export async function recomputeRecord(
  record: AttendanceRecord,
  shiftStart: string,
  workingDays: number[],
  rules: RuleSet,
  forceClosed = false,
) {
  const date = formatDateOnly(record.date);
  const day = await resolveDay(record.facultyId, workingDays, date);
  const result = computeDailyStatus({
    dayType: day.dayType,
    leave: day.leave,
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
    dayClosed: forceClosed || date < todayIST(clock.now()),
    shiftStart,
    rules,
  });
  const lateDeduction = result.status === 'LATE' && isLateDeduction(await lateDaysBefore(record.facultyId, date), rules);
  return prisma.attendanceRecord.update({
    where: { id: record.id },
    data: { status: result.status, workedMinutes: result.workedMinutes, lateDeduction },
  });
}

export const attendanceService = {
  /** REQ-ATT-01, 02, 03, 04: the server clock decides; any client time is ignored. */
  async checkIn(facultyId: string | null) {
    const faculty = await loadFaculty(facultyId);
    const now = clock.now();
    const date = todayIST(now);
    const rules = await getRules();
    const day = await resolveDay(faculty.id, faculty.shift.workingDays, date);

    if (day.dayType === 'HOLIDAY') {
      throw new AppError(409, 'HOLIDAY', `Today is a holiday (${day.holidayName}). Check-in is not allowed.`);
    }
    if (day.dayType === 'WEEKLY_OFF') throw new AppError(409, 'WEEKLY_OFF', 'Today is a weekly off. Check-in is not allowed.');
    if (day.leave === 'FULL') throw new AppError(409, 'ON_LEAVE', 'You are on approved leave today. Check-in is not allowed.');

    const existing = await prisma.attendanceRecord.findUnique({
      where: { facultyId_date: { facultyId: faculty.id, date: toDateOnly(date) } },
    });
    if (existing?.checkInAt) throw new AppError(409, 'ALREADY_CHECKED_IN', 'You have already checked in today');

    const window = checkInWindow(now, rules);
    if (!window.allowed) throw new AppError(409, window.code, window.message);

    const data = { checkInAt: now, status: 'PENDING' as const };
    try {
      const record = existing
        ? await prisma.attendanceRecord.update({ where: { id: existing.id }, data })
        : await prisma.attendanceRecord.create({ data: { facultyId: faculty.id, date: istDate(now), ...data } });
      return shapeRecord(record);
    } catch (e) {
      if (isUniqueViolation(e)) throw new AppError(409, 'ALREADY_CHECKED_IN', 'You have already checked in today');
      throw e;
    }
  },

  async checkOut(facultyId: string | null) {
    const faculty = await loadFaculty(facultyId);
    const now = clock.now();
    const rules = await getRules();
    const record = await prisma.attendanceRecord.findUnique({
      where: { facultyId_date: { facultyId: faculty.id, date: istDate(now) } },
    });
    if (record?.checkOutAt) throw new AppError(409, 'ALREADY_CHECKED_OUT', 'You have already checked out today');

    const window = checkOutWindow(now, record?.checkInAt, rules);
    if (!window.allowed) throw new AppError(409, window.code, window.message);

    const withPunch = await prisma.attendanceRecord.update({ where: { id: record!.id }, data: { checkOutAt: now } });
    return shapeRecord(await recomputeRecord(withPunch, faculty.shift.startTime, faculty.shift.workingDays, rules));
  },

  /** Today's record plus the kind of day, so the UI can show the right button. */
  async today(facultyId: string | null) {
    const faculty = await loadFaculty(facultyId);
    const now = clock.now();
    const date = todayIST(now);
    const [record, day] = await Promise.all([
      prisma.attendanceRecord.findUnique({ where: { facultyId_date: { facultyId: faculty.id, date: toDateOnly(date) } } }),
      resolveDay(faculty.id, faculty.shift.workingDays, date),
    ]);
    return {
      date,
      serverTime: now,
      dayType: day.dayType,
      onLeave: day.leave,
      holidayName: day.holidayName ?? null,
      record: record ? shapeRecord(record) : null,
    };
  },

  /** A faculty member's own records for a month (YYYY-MM). */
  async month(facultyId: string | null, month: string) {
    const faculty = await loadFaculty(facultyId);
    const [y, m] = month.split('-').map(Number);
    const rows = await prisma.attendanceRecord.findMany({
      where: { facultyId: faculty.id, date: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) } },
      orderBy: { date: 'asc' },
    });
    return rows.map(shapeRecord);
  },
};
