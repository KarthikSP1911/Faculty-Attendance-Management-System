import { Router } from 'express';
import type { Config } from '../config';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { departmentService } from '../services/departmentService';
import { recordAudit } from '../services/auditService';
import { facultyService } from '../services/facultyService';
import { holidayService } from '../services/holidayService';
import { shiftService } from '../services/shiftService';
import { ok } from '../utils/response';
import {
  departmentSchema,
  facultyCreateSchema,
  facultyQuerySchema,
  facultyUpdateSchema,
  holidayQuerySchema,
  holidaySchema,
  hodSchema,
  importSchema,
  rulesSchema,
  shiftSchema,
  statusSchema,
  type FacultyQuery,
} from '../validators/resources';

const admin = requireRole('ADMIN');

export function departmentRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg));

  r.get('/', async (_req, res) => ok(res, await departmentService.list()));
  r.get('/:id', async (req, res) => ok(res, await departmentService.get(String(req.params.id))));

  r.post('/', admin, validate(departmentSchema), async (req, res) => {
    const dept = await departmentService.create(req.body);
    await recordAudit(req, 'CREATE', 'Department', dept.id, undefined, dept);
    ok(res, dept, 201);
  });

  r.put('/:id', admin, validate(departmentSchema), async (req, res) => {
    const { before, after } = await departmentService.update(String(req.params.id), req.body);
    await recordAudit(req, 'UPDATE', 'Department', after.id, before, after);
    ok(res, after);
  });

  r.put('/:id/hod', admin, validate(hodSchema), async (req, res) => {
    const { before, after } = await departmentService.assignHod(String(req.params.id), req.body.facultyId);
    await recordAudit(req, 'UPDATE', 'Department', after.id, before, after);
    ok(res, after);
  });

  r.delete('/:id', admin, async (req, res) => {
    const before = await departmentService.remove(String(req.params.id));
    await recordAudit(req, 'DELETE', 'Department', before.id, before);
    res.status(204).end();
  });
  return r;
}

export function facultyRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg));

  r.get('/', requireRole('ADMIN', 'HOD'), validate(facultyQuerySchema, 'query'), async (req, res) => {
    ok(res, await facultyService.list(req.user!, res.locals.query as FacultyQuery));
  });

  r.post('/import', admin, validate(importSchema), async (req, res) => {
    const result = await facultyService.importCsv(req.body.csv);
    await recordAudit(req, 'CREATE', 'FacultyImport', 'bulk', undefined, { imported: result.imported, failed: result.failed });
    ok(res, result);
  });

  r.get('/:id', async (req, res) => ok(res, await facultyService.get(req.user!, String(req.params.id))));

  r.post('/', admin, validate(facultyCreateSchema), async (req, res) => {
    const { faculty, temporaryPassword } = await facultyService.create(req.body);
    await recordAudit(req, 'CREATE', 'Faculty', faculty.id, undefined, faculty);
    ok(res, { ...faculty, temporaryPassword }, 201);
  });

  r.put('/:id', admin, validate(facultyUpdateSchema), async (req, res) => {
    const { before, after } = await facultyService.update(String(req.params.id), req.body);
    await recordAudit(req, 'UPDATE', 'Faculty', after.id, before, after);
    ok(res, after);
  });

  r.patch('/:id/status', admin, validate(statusSchema), async (req, res) => {
    const { before, after } = await facultyService.setStatus(String(req.params.id), req.body.status);
    await recordAudit(req, 'UPDATE', 'Faculty', after.id, before, after);
    ok(res, after);
  });

  r.delete('/:id', admin, async (req, res) => {
    const before = await facultyService.remove(String(req.params.id));
    await recordAudit(req, 'DELETE', 'Faculty', before.id, before);
    res.status(204).end();
  });
  return r;
}

export function shiftRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg));
  r.get('/', async (_req, res) => ok(res, await shiftService.list()));
  r.put('/:id', admin, validate(shiftSchema), async (req, res) => {
    const { before, after } = await shiftService.update(String(req.params.id), req.body);
    await recordAudit(req, 'UPDATE', 'Shift', after.id, before, after);
    ok(res, after);
  });
  return r;
}

export function ruleRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg));
  r.get('/', async (_req, res) => ok(res, await shiftService.getRules()));
  r.put('/', admin, validate(rulesSchema), async (req, res) => {
    const { before, after } = await shiftService.setGrace(req.body.graceMinutes);
    await recordAudit(req, 'UPDATE', 'AttendanceRule', after.id, before, after);
    ok(res, after);
  });
  return r;
}

export function holidayRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg));
  r.get('/', validate(holidayQuerySchema, 'query'), async (_req, res) => {
    const { year, month } = res.locals.query as { year?: number; month?: number };
    ok(res, await holidayService.list(year, month));
  });
  r.post('/', admin, validate(holidaySchema), async (req, res) => {
    const h = await holidayService.create(req.body);
    await recordAudit(req, 'CREATE', 'Holiday', h.id, undefined, h);
    ok(res, h, 201);
  });
  r.put('/:id', admin, validate(holidaySchema), async (req, res) => {
    const { before, after } = await holidayService.update(String(req.params.id), req.body);
    await recordAudit(req, 'UPDATE', 'Holiday', after.id, before, after);
    ok(res, after);
  });
  r.delete('/:id', admin, async (req, res) => {
    const before = await holidayService.remove(String(req.params.id));
    await recordAudit(req, 'DELETE', 'Holiday', before.id, before);
    res.status(204).end();
  });
  return r;
}
