import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import type { Config } from '../config';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { openApiSpec } from '../openapi';
import { AppError } from '../utils/errors';
import { ok } from '../utils/response';

const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
const notificationQuery = z.object({ unread: z.enum(['true', 'false']).optional(), ...pageQuery });
const auditQuery = z.object({
  entity: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'CORRECTION']).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  ...pageQuery,
});

export function notificationRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg));

  r.get('/', validate(notificationQuery, 'query'), async (req, res) => {
    const q = res.locals.query as { unread?: 'true' | 'false'; page: number; pageSize: number };
    const where: Prisma.NotificationWhereInput = { userId: req.user!.id, ...(q.unread === 'true' ? { readAt: null } : {}) };
    const [total, unread, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }),
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    ok(res, { items, total, unread, page: q.page, pageSize: q.pageSize });
  });

  r.post('/read-all', async (req, res) => {
    const { count } = await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null }, data: { readAt: new Date() } });
    ok(res, { updated: count });
  });

  r.post('/:id/read', async (req, res) => {
    const n = await prisma.notification.findUnique({ where: { id: String(req.params.id) } });
    // Someone else's notification looks the same as a missing one.
    if (!n || n.userId !== req.user!.id) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    ok(res, await prisma.notification.update({ where: { id: n.id }, data: { readAt: n.readAt ?? new Date() } }));
  });
  return r;
}

/** REQ-AUD-01: admin-only viewer. */
export function auditRoutes(cfg: Config): Router {
  const r = Router();
  r.use(authenticate(cfg), requireRole('ADMIN'));
  r.get('/', validate(auditQuery, 'query'), async (_req, res) => {
    const q = res.locals.query as z.infer<typeof auditQuery>;
    const where: Prisma.AuditLogWhereInput = {
      ...(q.entity ? { entity: q.entity } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { actor: { select: { email: true } } },
      }),
    ]);
    ok(res, { items, total, page: q.page, pageSize: q.pageSize });
  });
  return r;
}

export function docsRoutes(): Router {
  const r = Router();
  r.get('/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });
  r.use('/', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  return r;
}
