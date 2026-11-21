import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import type { AuthUser } from '../types/express-augment';
import { clock } from '../utils/clock';
import { formatDateOnly, monthOf, todayIST, toDateOnly } from '../utils/dates';
import { AppError } from '../utils/errors';
import { getRules, recomputeRecord, resolveDay } from './attendanceService';
import { notify } from './notificationService';
import { validateRegularization } from './regularizationRules';

const include = {
  faculty: { select: { id: true, fullName: true, departmentId: true, userId: true, shift: true } },
} satisfies Prisma.RegularizationRequestInclude;
type Row = Prisma.RegularizationRequestGetPayload<{ include: typeof include }>;

/** HH:mm on an IST calendar date to an instant. */
const atIST = (date: string, hhmm: string): Date => new Date(new Date(`${date}T${hhmm}:00.000Z`).getTime() - 330 * 60_000);
const hhmmIST = (d: Date | null): string | null => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(11, 16) : null);

export const shapeReg = (r: Row) => ({
  id: r.id,
  facultyId: r.facultyId,
  facultyName: r.faculty.fullName,
  date: formatDateOnly(r.date),
  requestedCheckIn: hhmmIST(r.requestedCheckIn),
  requestedCheckOut: hhmmIST(r.requestedCheckOut),
  reason: r.reason,
  status: r.status,
  reviewComment: r.reviewComment,
  reviewedAt: r.reviewedAt,
  createdAt: r.createdAt,
});

async function getOrThrow(id: string): Promise<Row> {
  const r = await prisma.regularizationRequest.findUnique({ where: { id }, include });
  if (!r) throw new AppError(404, 'REGULARIZATION_NOT_FOUND', 'Regularization request not found');
  return r;
}

export const regularizationService = {
  async create(
    user: AuthUser,
    input: { date: string; requestedCheckIn?: string | null; requestedCheckOut?: string | null; reason: string },
  ) {
    if (!user.facultyId) throw new AppError(403, 'NO_FACULTY_PROFILE', 'This account has no faculty profile');
    const now = clock.now();
    const today = todayIST(now);
    const monthStart = toDateOnly(`${monthOf(today)}-01`);
    const nextMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
    const used = await prisma.regularizationRequest.count({
      where: { facultyId: user.facultyId, createdAt: { gte: new Date(monthStart.getTime() - 330 * 60_000), lt: new Date(nextMonth.getTime() - 330 * 60_000) } },
    });
    const issues = validateRegularization({ ...input, today }, used);
    const limit = issues.find((i) => i.code === 'LIMIT_REACHED');
    if (limit) throw new AppError(409, 'REGULARIZATION_LIMIT', limit.message);
    if (issues.length > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', issues.map((i) => ({ field: i.field, message: i.message })));
    }

    const faculty = await prisma.faculty.findUniqueOrThrow({ where: { id: user.facultyId }, include: { shift: true } });
    const day = await resolveDay(faculty.id, faculty.shift.workingDays, input.date);
    if (day.dayType !== 'WORKING' || day.leave === 'FULL') {
      throw new AppError(409, 'NOT_A_WORKING_DAY', 'That date is a holiday, weekly off or approved leave; nothing to regularize');
    }
    const pending = await prisma.regularizationRequest.findFirst({
      where: { facultyId: faculty.id, date: toDateOnly(input.date), status: 'PENDING' },
    });
    if (pending) throw new AppError(409, 'REGULARIZATION_EXISTS', 'A pending request already exists for this date');

    const created = await prisma.regularizationRequest.create({
      data: {
        facultyId: faculty.id,
        date: toDateOnly(input.date),
        requestedCheckIn: input.requestedCheckIn ? atIST(input.date, input.requestedCheckIn) : null,
        requestedCheckOut: input.requestedCheckOut ? atIST(input.date, input.requestedCheckOut) : null,
        reason: input.reason.trim(),
        createdAt: now,
      },
      include,
    });
    return shapeReg(created);
  },

  async list(user: AuthUser, query: { status?: 'PENDING' | 'APPROVED' | 'REJECTED'; page: number; pageSize: number }) {
    const where: Prisma.RegularizationRequestWhereInput = {};
    if (user.role === 'FACULTY') where.facultyId = user.facultyId ?? 'none';
    else if (user.role === 'HOD') where.faculty = { departmentId: user.departmentId ?? 'none' };
    if (query.status) where.status = query.status;
    const [total, rows] = await Promise.all([
      prisma.regularizationRequest.count({ where }),
      prisma.regularizationRequest.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items: rows.map(shapeReg), total, page: query.page, pageSize: query.pageSize };
  },

  /** REQ-REG-03: approve (recomputes the day) or reject with a comment. */
  async review(user: AuthUser, id: string, decision: 'APPROVED' | 'REJECTED', comment?: string) {
    const r = await getOrThrow(id);
    const sameDept = user.role === 'HOD' && r.faculty.departmentId === user.departmentId && r.facultyId !== user.facultyId;
    if (user.role !== 'ADMIN' && !sameDept) throw new AppError(403, 'FORBIDDEN', 'You cannot review this request');
    if (r.status !== 'PENDING') throw new AppError(409, 'INVALID_TRANSITION', `This request is already ${r.status.toLowerCase()}`);

    let recordBefore: unknown;
    let recordAfter: unknown;
    if (decision === 'APPROVED') {
      const date = formatDateOnly(r.date);
      const existing = await prisma.attendanceRecord.findUnique({
        where: { facultyId_date: { facultyId: r.facultyId, date: r.date } },
      });
      recordBefore = existing;
      const checkInAt = r.requestedCheckIn ?? existing?.checkInAt ?? null;
      const checkOutAt = r.requestedCheckOut ?? existing?.checkOutAt ?? null;
      if (checkInAt && checkOutAt && checkOutAt <= checkInAt) {
        throw new AppError(409, 'INVALID_TIMES', 'The requested times conflict with the existing punches');
      }
      const data = { checkInAt, checkOutAt, regularized: true };
      const saved = existing
        ? await prisma.attendanceRecord.update({ where: { id: existing.id }, data })
        : await prisma.attendanceRecord.create({ data: { facultyId: r.facultyId, date: r.date, ...data } });
      const rules = await getRules();
      recordAfter = await recomputeRecord(saved, r.faculty.shift.startTime, r.faculty.shift.workingDays, rules, date < todayIST(clock.now()));
    }

    const updated = await prisma.regularizationRequest.update({
      where: { id },
      data: { status: decision, reviewedById: user.id, reviewComment: comment ?? null, reviewedAt: clock.now() },
      include,
    });
    await notify(
      r.faculty.userId,
      'REGULARIZATION_DECISION',
      `Regularization ${decision.toLowerCase()}`,
      `Your request for ${formatDateOnly(r.date)} was ${decision.toLowerCase()}.${comment ? ` Comment: ${comment}` : ''}`,
    );
    return { before: shapeReg(r), after: shapeReg(updated), recordBefore, recordAfter };
  },
};
