import { Router } from 'express';
import { z } from 'zod';
import type { Config } from '../config';
import { runAbsentJob } from '../jobs/absentJob';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { attendanceService } from '../services/attendanceService';
import { recordAudit } from '../services/auditService';
import { isValidDateString } from '../utils/dates';
import { ok } from '../utils/response';

const monthQuery = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM') });
const jobBody = z.object({
  date: z.string().refine(isValidDateString, 'Date must be a valid YYYY-MM-DD date').optional(),
});

export function attendanceRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg));

  // The request body is never read: the server clock is the only time source (REQ-ATT-04).
  r.post('/check-in', async (req, res) => ok(res, await attendanceService.checkIn(req.user!.facultyId), 201));
  r.post('/check-out', async (req, res) => ok(res, await attendanceService.checkOut(req.user!.facultyId)));
  r.get('/today', async (req, res) => ok(res, await attendanceService.today(req.user!.facultyId)));
  r.get('/me', validate(monthQuery, 'query'), async (req, res) => {
    ok(res, await attendanceService.month(req.user!.facultyId, (res.locals.query as { month: string }).month));
  });

  r.post('/jobs/absent', requireRole('ADMIN'), validate(jobBody), async (req, res) => {
    const result = await runAbsentJob(req.body.date);
    await recordAudit(req, 'CORRECTION', 'AbsentJob', result.date, undefined, result);
    ok(res, result);
  });
  return r;
}
