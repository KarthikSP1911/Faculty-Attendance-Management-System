import { prisma } from '../db';
import type { AuthUser } from '../types/express-augment';
import { clock } from '../utils/clock';
import { todayIST } from '../utils/dates';
import { AppError } from '../utils/errors';
import { attendanceService } from './attendanceService';
import { addDays } from './leaveRules';
import { leaveService } from './leaveService';
import { DEFAULTER_THRESHOLD } from './reportRules';
import { buildReport, monthRange } from './reportService';

const monthToDate = () => {
  const today = todayIST(clock.now());
  return { today, from: `${today.slice(0, 7)}-01` };
};

/** REQ-DASH-01 */
async function faculty(user: AuthUser) {
  if (!user.facultyId) throw new AppError(403, 'NO_FACULTY_PROFILE', 'This account has no faculty profile');
  const { today, from } = monthToDate();
  const [todayInfo, report, balances] = await Promise.all([
    attendanceService.today(user.facultyId),
    buildReport(user, from, today),
    leaveService.balances(user, undefined, Number(today.slice(0, 4))),
  ]);
  const me = report[0];
  return {
    today: todayInfo,
    month: { counts: me?.counts, workingDays: me?.workingDays ?? 0, percentage: me?.percentage ?? 0 },
    balances,
  };
}

/** REQ-DASH-02 */
async function hod(user: AuthUser) {
  if (!user.departmentId) throw new AppError(403, 'NO_DEPARTMENT', 'This account has no department');
  const { today } = monthToDate();
  const trendFrom = addDays(today, -29);
  const rows = await buildReport(user, trendFrom, today);
  const idx = rows[0]?.days.length ? rows[0].days.length - 1 : 0;
  const todayCounts = { present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0, notMarked: 0 };
  for (const r of rows) {
    const s = r.days[idx]?.status;
    if (s === 'PRESENT' || s === 'PENDING') todayCounts.present++;
    else if (s === 'LATE') todayCounts.late++;
    else if (s === 'HALF_DAY') todayCounts.halfDay++;
    else if (s === 'ABSENT') todayCounts.absent++;
    else if (s === 'ON_LEAVE') todayCounts.onLeave++;
    else todayCounts.notMarked++;
  }
  const trend = (rows[0]?.days ?? []).map((d, i) => {
    let attended = 0;
    let working = 0;
    for (const r of rows) {
      const s = r.days[i].status;
      if (!s || s === 'HOLIDAY' || s === 'WEEKLY_OFF' || s === 'PENDING') continue;
      working++;
      if (s === 'PRESENT' || s === 'LATE' || s === 'ON_LEAVE') attended++;
      else if (s === 'HALF_DAY') attended += 0.5;
    }
    return { date: d.date, percentage: working ? Math.round((attended / working) * 10000) / 100 : null };
  });
  const dept = { departmentId: user.departmentId };
  const [pendingLeaves, pendingRegularizations] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: 'PENDING', faculty: dept, facultyId: { not: user.facultyId ?? undefined } } }),
    prisma.regularizationRequest.count({ where: { status: 'PENDING', faculty: dept, facultyId: { not: user.facultyId ?? undefined } } }),
  ]);
  return { today: todayCounts, headcount: rows.length, pendingApprovals: { leave: pendingLeaves, regularization: pendingRegularizations }, trend };
}

/** REQ-DASH-03 */
async function admin(user: AuthUser) {
  const { today, from } = monthToDate();
  const rows = await buildReport(user, from, today);
  const todayCounts = { present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0 };
  const byDept = new Map<string, { total: number; n: number }>();
  const defaulters: Array<{ employeeId: string; fullName: string; department: string; percentage: number }> = [];
  for (const r of rows) {
    const s = r.days[r.days.length - 1]?.status;
    if (s === 'PRESENT' || s === 'PENDING') todayCounts.present++;
    else if (s === 'LATE') todayCounts.late++;
    else if (s === 'HALF_DAY') todayCounts.halfDay++;
    else if (s === 'ABSENT') todayCounts.absent++;
    else if (s === 'ON_LEAVE') todayCounts.onLeave++;
    if (r.workingDays > 0) {
      const d = byDept.get(r.department) ?? { total: 0, n: 0 };
      d.total += r.percentage;
      d.n++;
      byDept.set(r.department, d);
      if (r.percentage < DEFAULTER_THRESHOLD) {
        defaulters.push({ employeeId: r.employeeId, fullName: r.fullName, department: r.department, percentage: r.percentage });
      }
    }
  }
  const [pendingLeaves, pendingRegularizations, departments] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.regularizationRequest.count({ where: { status: 'PENDING' } }),
    prisma.department.count(),
  ]);
  return {
    kpis: { totalFaculty: rows.length, departments, today: todayCounts, pendingLeaves, pendingRegularizations },
    departmentComparison: [...byDept.entries()]
      .map(([department, v]) => ({ department, percentage: Math.round((v.total / v.n) * 100) / 100 }))
      .sort((a, b) => a.department.localeCompare(b.department)),
    defaulters: defaulters.sort((a, b) => a.percentage - b.percentage),
    threshold: DEFAULTER_THRESHOLD,
  };
}

export const dashboardService = { faculty, hod, admin, monthRange };
