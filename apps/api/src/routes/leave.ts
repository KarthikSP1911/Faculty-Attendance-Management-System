import { Router } from 'express';
import { z } from 'zod';
import type { Config } from '../config';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { recordAudit } from '../services/auditService';
import { leaveService } from '../services/leaveService';
import { regularizationService } from '../services/regularizationService';
import { clock } from '../utils/clock';
import { todayIST } from '../utils/dates';
import { ok } from '../utils/response';

const leaveSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  halfDay: z.enum(['NONE', 'FIRST_HALF', 'SECOND_HALF']).default('NONE'),
  reason: z.string(),
  draft: z.boolean().optional(),
});
const listQuery = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
const balanceQuery = z.object({
  facultyId: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
const reviewSchema = z.object({ comment: z.string().trim().max(300).optional() });
const rejectSchema = z.object({ comment: z.string().trim().min(3, 'A comment is required to reject').max(300) });

const regSchema = z.object({
  date: z.string(),
  requestedCheckIn: z.string().nullable().optional(),
  requestedCheckOut: z.string().nullable().optional(),
  reason: z.string(),
});
const regListQuery = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const reviewers = requireRole('ADMIN', 'HOD');

export function leaveRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg));
  const q = (res: { locals: Record<string, unknown> }) => res.locals.query as never;

  r.get('/types', async (_req, res) => ok(res, await leaveService.types()));
  r.get('/balances', validate(balanceQuery, 'query'), async (req, res) => {
    const { facultyId, year } = res.locals.query as { facultyId?: string; year?: number };
    ok(res, await leaveService.balances(req.user!, facultyId, year ?? Number(todayIST(clock.now()).slice(0, 4))));
  });

  r.get('/', validate(listQuery, 'query'), async (req, res) => ok(res, await leaveService.list(req.user!, q(res))));
  r.post('/', validate(leaveSchema), async (req, res) => {
    const leave = await leaveService.create(req.user!, req.body);
    await recordAudit(req, 'CREATE', 'LeaveRequest', leave.id, undefined, leave);
    ok(res, leave, 201);
  });
  r.get('/:id', async (req, res) => ok(res, await leaveService.get(req.user!, String(req.params.id))));
  r.post('/:id/submit', async (req, res) => {
    const leave = await leaveService.submit(req.user!, String(req.params.id));
    await recordAudit(req, 'UPDATE', 'LeaveRequest', leave.id, { status: 'DRAFT' }, { status: 'PENDING' });
    ok(res, leave);
  });
  r.post('/:id/approve', reviewers, validate(reviewSchema), async (req, res) => {
    const { before, after } = await leaveService.review(req.user!, String(req.params.id), 'APPROVED', req.body.comment);
    await recordAudit(req, 'UPDATE', 'LeaveRequest', after.id, before, after);
    ok(res, after);
  });
  r.post('/:id/reject', reviewers, validate(rejectSchema), async (req, res) => {
    const { before, after } = await leaveService.review(req.user!, String(req.params.id), 'REJECTED', req.body.comment);
    await recordAudit(req, 'UPDATE', 'LeaveRequest', after.id, before, after);
    ok(res, after);
  });
  r.post('/:id/cancel', async (req, res) => {
    const { before, after } = await leaveService.cancel(req.user!, String(req.params.id));
    await recordAudit(req, 'UPDATE', 'LeaveRequest', after.id, before, after);
    ok(res, after);
  });
  return r;
}

export function regularizationRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg));

  r.get('/', validate(regListQuery, 'query'), async (req, res) => {
    ok(res, await regularizationService.list(req.user!, res.locals.query as never));
  });
  r.post('/', validate(regSchema), async (req, res) => {
    const reg = await regularizationService.create(req.user!, req.body);
    await recordAudit(req, 'CREATE', 'RegularizationRequest', reg.id, undefined, reg);
    ok(res, reg, 201);
  });
  r.post('/:id/approve', reviewers, validate(reviewSchema), async (req, res) => {
    const out = await regularizationService.review(req.user!, String(req.params.id), 'APPROVED', req.body.comment);
    await recordAudit(req, 'UPDATE', 'RegularizationRequest', out.after.id, out.before, out.after);
    await recordAudit(req, 'CORRECTION', 'AttendanceRecord', out.after.id, out.recordBefore, out.recordAfter);
    ok(res, out.after);
  });
  r.post('/:id/reject', reviewers, validate(rejectSchema), async (req, res) => {
    const out = await regularizationService.review(req.user!, String(req.params.id), 'REJECTED', req.body.comment);
    await recordAudit(req, 'UPDATE', 'RegularizationRequest', out.after.id, out.before, out.after);
    ok(res, out.after);
  });
  return r;
}
