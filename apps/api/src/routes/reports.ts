import { Router } from 'express';
import { z } from 'zod';
import type { Config } from '../config';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { dashboardService } from '../services/dashboardService';
import { sendTable } from '../services/exportService';
import { reportService } from '../services/reportService';
import { isValidDateString } from '../utils/dates';
import { ok } from '../utils/response';

const date = z.string().refine(isValidDateString, 'Date must be a valid YYYY-MM-DD date');
const filters = {
  departmentId: z.string().optional(),
  facultyId: z.string().optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
};
const dailyQuery = z.object({ date, ...filters });
const rangeQuery = z.object({ from: date, to: date, ...filters });
const monthQuery = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM'), ...filters });

type Q = { departmentId?: string; facultyId?: string; format: 'json' | 'csv' | 'pdf' };

export function reportRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg), requireRole('ADMIN', 'HOD'));

  r.get('/daily', validate(dailyQuery, 'query'), async (req, res) => {
    const q = res.locals.query as Q & { date: string };
    const rows = await reportService.daily(req.user!, q.date, q);
    await sendTable(res, q.format, {
      filename: `daily-${q.date}`,
      title: `Daily attendance ${q.date}`,
      headers: ['Employee ID', 'Name', 'Dept', 'Status', 'Check-in', 'Check-out', 'Worked (min)'],
      rows: rows.map((x) => [x.employeeId, x.fullName, x.department, x.status, x.checkInAt?.toISOString(), x.checkOutAt?.toISOString(), x.workedMinutes]),
      json: rows,
    });
  });

  r.get('/range', validate(rangeQuery, 'query'), async (req, res) => {
    const q = res.locals.query as Q & { from: string; to: string };
    const rows = await reportService.range(req.user!, q.from, q.to, q);
    await sendTable(res, q.format, {
      filename: `range-${q.from}_${q.to}`,
      title: `Attendance ${q.from} to ${q.to}`,
      headers: ['Employee ID', 'Name', 'Dept', 'Present', 'Late', 'Half Day', 'Absent', 'On Leave', 'Working Days', '%'],
      rows: rows.map((x) => [x.employeeId, x.fullName, x.department, x.counts.present, x.counts.late, x.counts.halfDay, x.counts.absent, x.counts.onLeave, x.workingDays, x.percentage]),
      json: rows,
    });
  });

  r.get('/monthly', validate(monthQuery, 'query'), async (req, res) => {
    const q = res.locals.query as Q & { month: string };
    const [y, m] = q.month.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${q.month}-01`;
    const to = `${q.month}-${String(last).padStart(2, '0')}`;
    const rows = await reportService.range(req.user!, from, to, q);
    await sendTable(res, q.format, {
      filename: `monthly-${q.month}`,
      title: `Monthly attendance ${q.month}`,
      headers: ['Employee ID', 'Name', 'Dept', 'Present', 'Late', 'Half Day', 'Absent', 'On Leave', 'Working Days', '%'],
      rows: rows.map((x) => [x.employeeId, x.fullName, x.department, x.counts.present, x.counts.late, x.counts.halfDay, x.counts.absent, x.counts.onLeave, x.workingDays, x.percentage]),
      json: rows,
    });
  });

  r.get('/muster', validate(monthQuery, 'query'), async (req, res) => {
    const q = res.locals.query as Q & { month: string };
    const muster = await reportService.muster(req.user!, q.month, q);
    await sendTable(res, q.format, {
      filename: `muster-${q.month}`,
      title: `Muster roll ${q.month}`,
      headers: ['Employee ID', 'Name', ...muster.days.map((d) => d.slice(8)), '%'],
      rows: muster.rows.map((x) => [x.employeeId, x.fullName, ...x.codes, x.percentage]),
      json: muster,
    });
  });
  return r;
}

export function dashboardRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg));
  r.get('/faculty', async (req, res) => ok(res, await dashboardService.faculty(req.user!)));
  r.get('/hod', requireRole('HOD'), async (req, res) => ok(res, await dashboardService.hod(req.user!)));
  r.get('/admin', requireRole('ADMIN'), async (req, res) => ok(res, await dashboardService.admin(req.user!)));
  return r;
}
