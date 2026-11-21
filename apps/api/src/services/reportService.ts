import type { AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from '../db';
import type { AuthUser } from '../types/express-augment';
import { clock } from '../utils/clock';
import { formatDateOnly, isoWeekday, todayIST, toDateOnly } from '../utils/dates';
import { AppError } from '../utils/errors';
import { addDays, diffDays } from './leaveRules';
import { calculateAttendancePercentage, emptyCounts, musterCode, type Counts } from './reportRules';

export const MAX_RANGE_DAYS = 366;

export interface ReportFilter {
  departmentId?: string;
  facultyId?: string;
}

/** Admin sees everyone, an HOD their department, faculty only themselves. */
function scopeWhere(user: AuthUser, f: ReportFilter): Prisma.FacultyWhereInput {
  const where: Prisma.FacultyWhereInput = {};
  if (user.role === 'FACULTY') where.id = user.facultyId ?? 'none';
  else if (user.role === 'HOD') {
    where.departmentId = user.departmentId ?? 'none';
    if (f.departmentId && f.departmentId !== user.departmentId) throw new AppError(403, 'FORBIDDEN', 'You can report on your own department only');
  } else if (f.departmentId) where.departmentId = f.departmentId;
  if (f.facultyId) where.id = f.facultyId;
  return where;
}

export function assertRange(from: string, to: string): void {
  if (to < from) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'to', message: 'End date cannot be before the start date' }]);
  if (diffDays(from, to) + 1 > MAX_RANGE_DAYS) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'to', message: `Range cannot exceed ${MAX_RANGE_DAYS} days` }]);
  }
}

export interface DayCell {
  date: string;
  status: AttendanceStatus | null;
  code: string;
}

export interface FacultyReport {
  facultyId: string;
  employeeId: string;
  fullName: string;
  department: string;
  counts: Counts;
  workingDays: number;
  percentage: number;
  days: DayCell[];
}

/**
 * Day-by-day statuses for each faculty member over [from, to]. A past working day with no record
 * counts as Absent (the nightly job may not have run yet); today with no record is left open.
 */
export async function buildReport(user: AuthUser, from: string, to: string, filter: ReportFilter = {}): Promise<FacultyReport[]> {
  assertRange(from, to);
  const today = todayIST(clock.now());
  const fromD = toDateOnly(from);
  const toD = toDateOnly(to);
  const faculty = await prisma.faculty.findMany({
    where: scopeWhere(user, filter),
    include: {
      shift: true,
      department: { select: { code: true } },
      attendance: { where: { date: { gte: fromD, lte: toD } } },
    },
    orderBy: { employeeId: 'asc' },
  });
  const holidays = new Set(
    (await prisma.holiday.findMany({ where: { date: { gte: fromD, lte: toD } } })).map((h) => formatDateOnly(h.date)),
  );

  return faculty.map((f) => {
    const byDate = new Map(f.attendance.map((a) => [formatDateOnly(a.date), a]));
    const joined = formatDateOnly(f.dateOfJoining);
    const counts = emptyCounts();
    let workingDays = 0;
    const days: DayCell[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
      let status: AttendanceStatus | null = null;
      const rec = byDate.get(d);
      if (d < joined) status = null;
      else if (holidays.has(d)) status = 'HOLIDAY';
      else if (!f.shift.workingDays.includes(isoWeekday(d))) status = 'WEEKLY_OFF';
      else if (rec) status = rec.status;
      else if (d < today) status = 'ABSENT';

      const countable = status !== null && status !== 'HOLIDAY' && status !== 'WEEKLY_OFF' && status !== 'PENDING';
      if (countable) {
        workingDays++;
        if (status === 'PRESENT') counts.present++;
        else if (status === 'LATE') {
          counts.late++;
          if (rec?.lateDeduction) counts.lateDeductions++;
        } else if (status === 'HALF_DAY') counts.halfDay++;
        else if (status === 'ABSENT') counts.absent++;
        else if (status === 'ON_LEAVE') counts.onLeave++;
      }
      days.push({ date: d, status, code: status ? musterCode(status) : '-' });
    }
    return {
      facultyId: f.id,
      employeeId: f.employeeId,
      fullName: f.fullName,
      department: f.department.code,
      counts,
      workingDays,
      percentage: calculateAttendancePercentage(counts, workingDays),
      days,
    };
  });
}

export const monthRange = (month: string): { from: string; to: string } => {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
};

export const reportService = {
  async daily(user: AuthUser, date: string, filter: ReportFilter) {
    const rows = await buildReport(user, date, date, filter);
    const records = await prisma.attendanceRecord.findMany({ where: { date: toDateOnly(date), facultyId: { in: rows.map((r) => r.facultyId) } } });
    const byId = new Map(records.map((r) => [r.facultyId, r]));
    return rows.map((r) => ({
      employeeId: r.employeeId,
      fullName: r.fullName,
      department: r.department,
      status: r.days[0].status,
      checkInAt: byId.get(r.facultyId)?.checkInAt ?? null,
      checkOutAt: byId.get(r.facultyId)?.checkOutAt ?? null,
      workedMinutes: byId.get(r.facultyId)?.workedMinutes ?? null,
    }));
  },

  async range(user: AuthUser, from: string, to: string, filter: ReportFilter) {
    const rows = await buildReport(user, from, to, filter);
    return rows.map(({ days: _days, ...rest }) => rest);
  },

  async muster(user: AuthUser, month: string, filter: ReportFilter) {
    const { from, to } = monthRange(month);
    const rows = await buildReport(user, from, to, filter);
    return {
      month,
      days: rows[0]?.days.map((d) => d.date) ?? [],
      rows: rows.map((r) => ({
        employeeId: r.employeeId,
        fullName: r.fullName,
        department: r.department,
        codes: r.days.map((d) => d.code),
        counts: r.counts,
        workingDays: r.workingDays,
        percentage: r.percentage,
      })),
    };
  },
};
