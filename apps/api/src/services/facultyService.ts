import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type { Designation, FacultyStatus, Prisma } from '@prisma/client';
import { prisma } from '../db';
import type { AuthUser } from '../types/express-augment';
import { clock } from '../utils/clock';
import { formatDateOnly, toDateOnly, todayIST } from '../utils/dates';
import { AppError } from '../utils/errors';
import { isUniqueViolation } from '../utils/prismaErrors';
import { MAX_IMPORT_ROWS, missingColumns, parseCsv, toRecords, validateCsvRows } from './csvImport';
import { formatEmployeeId, nextEmployeeId, parseEmployeeNumber } from './employeeId';
import type { FacultyQuery } from '../validators/resources';

const TX_OPTIONS = { timeout: 30_000, maxWait: 15_000 };
const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 10;

const select = {
  id: true,
  userId: true,
  employeeId: true,
  fullName: true,
  phone: true,
  designation: true,
  dateOfJoining: true,
  status: true,
  departmentId: true,
  shiftId: true,
  department: { select: { id: true, code: true, name: true } },
  shift: { select: { id: true, name: true } },
  user: { select: { email: true } },
} satisfies Prisma.FacultySelect;

type Row = Prisma.FacultyGetPayload<{ select: typeof select }>;

export const shape = (f: Row) => ({
  id: f.id,
  employeeId: f.employeeId,
  fullName: f.fullName,
  email: f.user.email,
  phone: f.phone,
  designation: f.designation,
  dateOfJoining: formatDateOnly(f.dateOfJoining),
  status: f.status,
  department: f.department,
  shift: f.shift,
});

/** Random password that always satisfies the password policy. */
export const generatePassword = (): string => `Aa1!${randomBytes(9).toString('base64url')}`;

async function getOrThrow(id: string) {
  const f = await prisma.faculty.findUnique({ where: { id }, select });
  if (!f) throw new AppError(404, 'FACULTY_NOT_FOUND', 'Faculty not found');
  return f;
}

async function defaultShiftId(): Promise<string> {
  const shift = (await prisma.shift.findFirst({ where: { isDefault: true } })) ?? (await prisma.shift.findFirst());
  if (!shift) throw new AppError(409, 'NO_SHIFT', 'No shift is configured');
  return shift.id;
}

type NewFaculty = {
  fullName: string;
  email: string;
  phone: string;
  departmentId: string;
  designation: Designation;
  dateOfJoining: string;
  shiftId: string;
  status: FacultyStatus;
  password: string;
};

/** Creates user + faculty + this year's leave balances. `employeeNumber` is the next free number. */
async function createOne(
  tx: Prisma.TransactionClient,
  d: NewFaculty,
  employeeNumber: number,
  types: { id: string; yearlyQuota: number | null }[],
) {
  const user = await tx.user.create({
    data: {
      email: d.email,
      role: 'FACULTY',
      isActive: d.status === 'ACTIVE',
      passwordHash: await bcrypt.hash(d.password, BCRYPT_COST),
    },
  });
  const faculty = await tx.faculty.create({
    data: {
      employeeId: formatEmployeeId(employeeNumber),
      userId: user.id,
      fullName: d.fullName,
      phone: d.phone,
      departmentId: d.departmentId,
      designation: d.designation,
      dateOfJoining: toDateOnly(d.dateOfJoining),
      shiftId: d.shiftId,
      status: d.status,
    },
    select,
  });
  const year = Number(todayIST(clock.now()).slice(0, 4));
  await tx.leaveBalance.createMany({
    data: types.map((t) => ({ facultyId: faculty.id, leaveTypeId: t.id, year, allotted: t.yearlyQuota ?? 0 })),
  });
  return faculty;
}

const maxEmployeeNumber = async (tx: Prisma.TransactionClient): Promise<number> => {
  const ids = (await tx.faculty.findMany({ select: { employeeId: true } })).map((f) => f.employeeId);
  return parseEmployeeNumber(nextEmployeeId(ids)) as number;
};

export const facultyService = {
  async list(actor: AuthUser, q: FacultyQuery) {
    const departmentId = actor.role === 'HOD' ? (actor.departmentId ?? '__none__') : q.departmentId;
    const where: Prisma.FacultyWhereInput = {
      ...(departmentId ? { departmentId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.q
        ? {
            OR: [
              { fullName: { contains: q.q, mode: 'insensitive' } },
              { employeeId: { contains: q.q, mode: 'insensitive' } },
              { user: { email: { contains: q.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.faculty.count({ where }),
      prisma.faculty.findMany({
        where,
        select,
        orderBy: [{ [q.sortBy]: q.order }, { id: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { items: rows.map(shape), page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) };
  },

  /** Admin: anyone. HOD: own department. Faculty: only themselves (REQ-RBAC-02/03). */
  async get(actor: AuthUser, id: string) {
    if (actor.role === 'FACULTY' && actor.facultyId !== id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only view your own profile');
    }
    const f = await getOrThrow(id);
    if (actor.role === 'HOD' && f.departmentId !== actor.departmentId) {
      throw new AppError(403, 'FORBIDDEN', 'This faculty member belongs to another department');
    }
    return shape(f);
  },

  async create(data: Omit<NewFaculty, 'shiftId' | 'status' | 'password'> & { shiftId?: string; status?: FacultyStatus; password?: string }) {
    if (await prisma.user.findUnique({ where: { email: data.email } })) {
      throw new AppError(409, 'EMAIL_TAKEN', 'A user with this email already exists');
    }
    if (!(await prisma.department.findUnique({ where: { id: data.departmentId } }))) {
      throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found');
    }
    const shiftId = data.shiftId ?? (await defaultShiftId());
    if (!(await prisma.shift.findUnique({ where: { id: shiftId } }))) throw new AppError(404, 'SHIFT_NOT_FOUND', 'Shift not found');

    const temporaryPassword = data.password ? undefined : generatePassword();
    const input: NewFaculty = { ...data, shiftId, status: data.status ?? 'ACTIVE', password: data.password ?? (temporaryPassword as string) };
    try {
      const types = await prisma.leaveType.findMany();
      const faculty = await prisma.$transaction(async (tx) => createOne(tx, input, await maxEmployeeNumber(tx), types), TX_OPTIONS);
      return { faculty: shape(faculty), temporaryPassword };
    } catch (e) {
      if (isUniqueViolation(e)) throw new AppError(409, 'CONFLICT', 'Employee ID or email already in use, please retry');
      throw e;
    }
  },

  async update(id: string, data: Partial<{ fullName: string; email: string; phone: string; departmentId: string; designation: Designation; dateOfJoining: string; shiftId: string }>) {
    const current = await getOrThrow(id);
    const before = shape(current);
    if (data.departmentId && data.departmentId !== current.departmentId) {
      if (!(await prisma.department.findUnique({ where: { id: data.departmentId } }))) throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found');
      if (await prisma.department.findFirst({ where: { hodId: id } })) {
        throw new AppError(409, 'HOD_REASSIGN_REQUIRED', 'Reassign the department HOD before moving this faculty member');
      }
    }
    if (data.shiftId && !(await prisma.shift.findUnique({ where: { id: data.shiftId } }))) throw new AppError(404, 'SHIFT_NOT_FOUND', 'Shift not found');
    try {
      await prisma.$transaction(async (tx) => {
        const { email, dateOfJoining, ...rest } = data;
        if (email) await tx.user.update({ where: { id: current.userId }, data: { email } });
        await tx.faculty.update({ where: { id }, data: { ...rest, ...(dateOfJoining ? { dateOfJoining: toDateOnly(dateOfJoining) } : {}) } });
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new AppError(409, 'EMAIL_TAKEN', 'A user with this email already exists');
      throw e;
    }
    return { before, after: shape(await getOrThrow(id)) };
  },

  /** Deactivating blocks login but keeps all history (REQ-FAC-05). */
  async setStatus(id: string, status: FacultyStatus) {
    const current = await getOrThrow(id);
    const before = shape(current);
    if (status === 'INACTIVE' && (await prisma.department.findFirst({ where: { hodId: id } }))) {
      throw new AppError(409, 'HOD_REASSIGN_REQUIRED', 'Reassign the department HOD before deactivating this faculty member');
    }
    const faculty = await prisma.faculty.findUniqueOrThrow({ where: { id }, select: { userId: true } });
    await prisma.$transaction([
      prisma.faculty.update({ where: { id }, data: { status } }),
      prisma.user.update({ where: { id: faculty.userId }, data: { isActive: status === 'ACTIVE' } }),
      ...(status === 'INACTIVE'
        ? [prisma.refreshToken.updateMany({ where: { userId: faculty.userId, revokedAt: null }, data: { revokedAt: clock.now() } })]
        : []),
    ]);
    return { before, after: shape(await getOrThrow(id)) };
  },

  /** Hard delete is only allowed for faculty with no history; otherwise deactivate instead. */
  async remove(id: string) {
    const before = shape(await getOrThrow(id));
    if (await prisma.department.findFirst({ where: { hodId: id } })) {
      throw new AppError(409, 'HOD_REASSIGN_REQUIRED', 'Reassign the department HOD before deleting this faculty member');
    }
    const [att, leave, reg] = await Promise.all([
      prisma.attendanceRecord.count({ where: { facultyId: id } }),
      prisma.leaveRequest.count({ where: { facultyId: id } }),
      prisma.regularizationRequest.count({ where: { facultyId: id } }),
    ]);
    if (att + leave + reg > 0) {
      throw new AppError(409, 'FACULTY_HAS_HISTORY', 'Faculty has attendance or leave history. Deactivate instead of deleting.');
    }
    const { userId } = await prisma.faculty.findUniqueOrThrow({ where: { id }, select: { userId: true } });
    await prisma.$transaction([
      prisma.leaveBalance.deleteMany({ where: { facultyId: id } }),
      prisma.faculty.delete({ where: { id } }),
      prisma.refreshToken.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    return before;
  },

  /** CSV bulk import: valid rows are created, invalid rows are reported with their line number. */
  async importCsv(csv: string) {
    const rows = parseCsv(csv);
    if (rows.length === 0) throw new AppError(400, 'INVALID_CSV', 'The CSV is empty');
    const missing = missingColumns(rows[0]);
    if (missing.length > 0) throw new AppError(400, 'INVALID_CSV', `Missing required columns: ${missing.join(', ')}`);
    if (rows.length === 1) throw new AppError(400, 'INVALID_CSV', 'The CSV has a header but no data rows');
    if (rows.length - 1 > MAX_IMPORT_ROWS) throw new AppError(400, 'INVALID_CSV', `At most ${MAX_IMPORT_ROWS} rows can be imported at once`);

    const types = await prisma.leaveType.findMany();
    const records = toRecords(rows);
    const [departments, users, shiftId] = await Promise.all([
      prisma.department.findMany({ select: { id: true, code: true } }),
      prisma.user.findMany({ where: { email: { in: records.map((r) => (r.email ?? '').toLowerCase()) } }, select: { email: true } }),
      defaultShiftId(),
    ]);
    const deptByCode = new Map(departments.map((d) => [d.code, d.id]));
    const { valid, errors } = validateCsvRows(records, {
      departmentCodes: new Set(deptByCode.keys()),
      existingEmails: new Set(users.map((u) => u.email)),
      today: todayIST(clock.now()),
    });

    if (valid.length > 0) {
      try {
        await prisma.$transaction(
          async (tx) => {
            let next = await maxEmployeeNumber(tx);
            for (const { data } of valid) {
              await createOne(
                tx,
                {
                  ...data,
                  departmentId: deptByCode.get(data.departmentCode) as string,
                  shiftId,
                  status: 'ACTIVE',
                  password: generatePassword(),
                },
                next++,
                types,
              );
            }
          },
          { timeout: 120_000, maxWait: 15_000 },
        );
      } catch (e) {
        if (isUniqueViolation(e)) throw new AppError(409, 'CONFLICT', 'A conflicting record was created meanwhile, please retry');
        throw e;
      }
    }
    return { imported: valid.length, failed: errors.length, errors };
  },
};
