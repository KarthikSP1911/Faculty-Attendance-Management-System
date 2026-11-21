import type { Request } from 'express';
import { prisma } from '../db';

const plain = (v: unknown) => (v === undefined || v === null ? undefined : JSON.parse(JSON.stringify(v)));

/** Records who changed what (REQ-AUD-01). Call after every successful create/update/delete. */
export async function recordAudit(
  req: Request,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CORRECTION',
  entity: string,
  entityId: string,
  oldValue?: unknown,
  newValue?: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: req.user?.id ?? null,
      action,
      entity,
      entityId,
      oldValue: plain(oldValue),
      newValue: plain(newValue),
      ip: req.ip ?? null,
    },
  });
}
