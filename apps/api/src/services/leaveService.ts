import type { HalfDay, LeaveStatus, Prisma } from '@prisma/client';
import { prisma } from '../db';
import type { AuthUser } from '../types/express-augment';
import { clock } from '../utils/clock';
import { formatDateOnly, todayIST, toDateOnly } from '../utils/dates';
import { AppError } from '../utils/errors';
import { canTransitionLeave, validateLeaveRequest } from './leaveRules';
import { notify } from './notificationService';

const num = (d: { toString(): string } | null | undefined): number => Number(d?.toString() ?? 0);

const include = {
  leaveType: { select: { code: true, name: true } },
  faculty: { select: { id: true, fullName: true, departmentId: true, userId: true } },
} satisfies Prisma.LeaveRequestInclude;
type Row = Prisma.LeaveRequestGetPayload<{ include: typeof include }>;

export const shapeLeave = (l: Row) => ({
  id: l.id,
  facultyId: l.facultyId,
  facultyName: l.faculty.fullName,
  leaveType: l.leaveType,
  startDate: formatDateOnly(l.startDate),
  endDate: formatDateOnly(l.endDate),
  days: num(l.days),
  halfDay: l.halfDay,
  reason: l.reason,
  status: l.status,
  reviewComment: l.reviewComment,
  reviewedAt: l.reviewedAt,
  createdAt: l.createdAt,
});

async function getOrThrow(id: string): Promise<Row> {
  const l = await prisma.leaveRequest.findUnique({ where: { id }, include });
  if (!l) throw new AppError(404, 'LEAVE_NOT_FOUND', 'Leave request not found');
  return l;
}

/** Faculty see their own; an HOD their department; an admin everything. */
function assertCanView(user: AuthUser, l: Row): void {
  if (user.role === 'ADMIN') return;
  if (user.role === 'HOD' && l.faculty.departmentId === user.departmentId) return;
  if (l.facultyId === user.facultyId) return;
  throw new AppError(403, 'FORBIDDEN', 'You do not have access to this leave request');
}

/** REQ-LEAVE-05: an HOD reviews their own department only (never their own request); an admin any. */
function assertCanReview(user: AuthUser, l: Row): void {
  if (user.role === 'ADMIN') return;
  if (user.role === 'HOD' && l.facultyId !== user.facultyId && l.faculty.departmentId === user.departmentId) return;
  throw new AppError(403, 'FORBIDDEN', 'You cannot review this leave request');
}

/** REQ-LEAVE-01: yearly balances are created on first use from each type's quota. */
export async function ensureBalances(facultyId: string, year: number) {
  const types = await prisma.leaveType.findMany({ where: { yearlyQuota: { not: null } } });
  const existing = await prisma.leaveBalance.findMany({ where: { facultyId, year } });
  const missing = types.filter((t) => !existing.some((b) => b.leaveTypeId === t.id));
  if (missing.length > 0) {
    await prisma.leaveBalance.createMany({
      data: missing.map((t) => ({ facultyId, leaveTypeId: t.id, year, allotted: t.yearlyQuota! })),
      skipDuplicates: true,
    });
  }
  return prisma.leaveBalance.findMany({ where: { facultyId, year }, include: { leaveType: true } });
}

async function pendingDays(facultyId: string, leaveTypeId: string, year: number): Promise<number> {
  const agg = await prisma.leaveRequest.aggregate({
    _sum: { days: true },
    where: {
      facultyId,
      leaveTypeId,
      status: 'PENDING',
      startDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
    },
  });
  return num(agg._sum.days);
}

export interface LeaveCreate {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  halfDay: HalfDay;
  reason: string;
  draft?: boolean;
}

async function validateOrThrow(facultyId: string, input: LeaveCreate, excludeId?: string) {
  const faculty = await prisma.faculty.findUnique({ where: { id: facultyId }, include: { shift: true } });
  if (!faculty) throw new AppError(404, 'FACULTY_NOT_FOUND', 'Faculty not found');
  const type = await prisma.leaveType.findUnique({ where: { id: input.leaveTypeId } });
  if (!type) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'leaveTypeId', message: 'Unknown leave type' }]);

  const start = toDateOnly(input.startDate);
  const end = toDateOnly(input.endDate);
  const year = Number(input.startDate.slice(0, 4));
  const [holidayRows, overlap] = await Promise.all([
    prisma.holiday.findMany({ where: { date: { gte: start, lte: end } } }),
    prisma.leaveRequest.findFirst({
      where: {
        facultyId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }),
  ]);

  let remaining: number | null = null;
  if (type.yearlyQuota !== null) {
    const balances = await ensureBalances(facultyId, year);
    const b = balances.find((x) => x.leaveTypeId === type.id);
    remaining = b ? num(b.allotted) - num(b.used) - (await pendingDays(facultyId, type.id, year)) : 0;
  }

  const { days, issues } = validateLeaveRequest(
    { ...input, today: todayIST(clock.now()) },
    {
      workingDays: faculty.shift.workingDays,
      holidays: new Set(holidayRows.map((h) => formatDateOnly(h.date))),
      balanceRemaining: remaining,
      overlaps: overlap !== null,
    },
  );
  const conflict = issues.find((i) => i.code !== 'INVALID');
  if (conflict) {
    throw new AppError(409, conflict.code === 'OVERLAP' ? 'LEAVE_OVERLAP' : 'INSUFFICIENT_BALANCE', conflict.message);
  }
  if (issues.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', issues.map((i) => ({ field: i.field, message: i.message })));
  }
  return { days, type, year };
}

async function transition(l: Row, to: LeaveStatus) {
  const check = canTransitionLeave(l.status, to, { startDate: formatDateOnly(l.startDate), today: todayIST(clock.now()) });
  if (!check.allowed) throw new AppError(409, 'INVALID_TRANSITION', check.message);
}

async function adjustUsed(l: Row, delta: number) {
  const year = l.startDate.getUTCFullYear();
  const type = await prisma.leaveType.findUnique({ where: { id: l.leaveTypeId } });
  if (type?.yearlyQuota === null) return; // unlimited: nothing to track
  await ensureBalances(l.facultyId, year);
  await prisma.leaveBalance.update({
    where: { facultyId_leaveTypeId_year: { facultyId: l.facultyId, leaveTypeId: l.leaveTypeId, year } },
    data: { used: { increment: delta } },
  });
}

export const leaveService = {
  async types() {
    return prisma.leaveType.findMany({ orderBy: { code: 'asc' } });
  },

  async balances(user: AuthUser, facultyId: string | undefined, year: number) {
    const target = facultyId ?? user.facultyId;
    if (!target) throw new AppError(403, 'NO_FACULTY_PROFILE', 'This account has no faculty profile');
    if (target !== user.facultyId && user.role !== 'ADMIN') {
      const f = await prisma.faculty.findUnique({ where: { id: target } });
      if (!(user.role === 'HOD' && f?.departmentId === user.departmentId)) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have access to this faculty member');
      }
    }
    const rows = await ensureBalances(target, year);
    return rows.map((b) => ({
      leaveType: { code: b.leaveType.code, name: b.leaveType.name },
      year: b.year,
      allotted: num(b.allotted),
      used: num(b.used),
      remaining: num(b.allotted) - num(b.used),
    }));
  },

  async create(user: AuthUser, input: LeaveCreate) {
    if (!user.facultyId) throw new AppError(403, 'NO_FACULTY_PROFILE', 'This account has no faculty profile');
    const { days } = await validateOrThrow(user.facultyId, input);
    const created = await prisma.leaveRequest.create({
      data: {
        facultyId: user.facultyId,
        leaveTypeId: input.leaveTypeId,
        startDate: toDateOnly(input.startDate),
        endDate: toDateOnly(input.endDate),
        days,
        halfDay: input.halfDay,
        reason: input.reason.trim(),
        status: input.draft ? 'DRAFT' : 'PENDING',
      },
      include,
    });
    return shapeLeave(created);
  },

  async submit(user: AuthUser, id: string) {
    const l = await getOrThrow(id);
    if (l.facultyId !== user.facultyId) throw new AppError(403, 'FORBIDDEN', 'You can submit only your own requests');
    await transition(l, 'PENDING');
    await validateOrThrow(l.facultyId, {
      leaveTypeId: l.leaveTypeId,
      startDate: formatDateOnly(l.startDate),
      endDate: formatDateOnly(l.endDate),
      halfDay: l.halfDay,
      reason: l.reason,
    }, l.id);
    return shapeLeave(await prisma.leaveRequest.update({ where: { id }, data: { status: 'PENDING' }, include }));
  },

  async list(user: AuthUser, query: { status?: LeaveStatus; page: number; pageSize: number }) {
    const where: Prisma.LeaveRequestWhereInput = {};
    if (user.role === 'FACULTY') where.facultyId = user.facultyId ?? 'none';
    else if (user.role === 'HOD') where.faculty = { departmentId: user.departmentId ?? 'none' };
    if (query.status) where.status = query.status;
    const [total, rows] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items: rows.map(shapeLeave), total, page: query.page, pageSize: query.pageSize };
  },

  async get(user: AuthUser, id: string) {
    const l = await getOrThrow(id);
    assertCanView(user, l);
    return shapeLeave(l);
  },

  async review(user: AuthUser, id: string, decision: 'APPROVED' | 'REJECTED', comment?: string) {
    const l = await getOrThrow(id);
    assertCanReview(user, l);
    await transition(l, decision);
    if (decision === 'APPROVED') await adjustUsed(l, num(l.days));
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: decision, reviewedById: user.id, reviewComment: comment ?? null, reviewedAt: clock.now() },
      include,
    });
    await notify(
      l.faculty.userId,
      'LEAVE_DECISION',
      `Leave ${decision.toLowerCase()}`,
      `Your ${l.leaveType.name} request (${formatDateOnly(l.startDate)} to ${formatDateOnly(l.endDate)}) was ${decision.toLowerCase()}.${comment ? ` Comment: ${comment}` : ''}`,
    );
    return { before: shapeLeave(l), after: shapeLeave(updated) };
  },

  /** REQ-LEAVE-06: cancelling approved leave gives the days back. */
  async cancel(user: AuthUser, id: string) {
    const l = await getOrThrow(id);
    if (l.facultyId !== user.facultyId && user.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'You can cancel only your own requests');
    }
    await transition(l, 'CANCELLED');
    if (l.status === 'APPROVED') await adjustUsed(l, -num(l.days));
    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' }, include });
    return { before: shapeLeave(l), after: shapeLeave(updated) };
  },
};

