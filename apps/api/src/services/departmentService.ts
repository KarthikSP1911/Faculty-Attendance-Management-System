import { prisma } from '../db';
import { AppError } from '../utils/errors';
import { isUniqueViolation } from '../utils/prismaErrors';

const view = {
  id: true,
  name: true,
  code: true,
  hodId: true,
  hod: { select: { id: true, fullName: true, employeeId: true } },
  _count: { select: { faculty: { where: { status: 'ACTIVE' as const } } } },
};

const shape = (d: {
  id: string;
  name: string;
  code: string;
  hodId: string | null;
  hod: { id: string; fullName: string; employeeId: string } | null;
  _count: { faculty: number };
}) => ({ id: d.id, name: d.name, code: d.code, hod: d.hod, activeFacultyCount: d._count.faculty });

async function getOrThrow(id: string) {
  const dept = await prisma.department.findUnique({ where: { id }, select: view });
  if (!dept) throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found');
  return dept;
}

export const departmentService = {
  list: async () => (await prisma.department.findMany({ select: view, orderBy: { code: 'asc' } })).map(shape),

  get: async (id: string) => shape(await getOrThrow(id)),

  async create(data: { name: string; code: string }) {
    try {
      return shape(await prisma.department.create({ data, select: view }));
    } catch (e) {
      if (isUniqueViolation(e)) throw new AppError(409, 'DEPARTMENT_CODE_EXISTS', 'A department with this code already exists');
      throw e;
    }
  },

  async update(id: string, data: { name: string; code: string }) {
    const before = shape(await getOrThrow(id));
    try {
      const after = shape(await prisma.department.update({ where: { id }, data, select: view }));
      return { before, after };
    } catch (e) {
      if (isUniqueViolation(e)) throw new AppError(409, 'DEPARTMENT_CODE_EXISTS', 'A department with this code already exists');
      throw e;
    }
  },

  async remove(id: string) {
    const before = shape(await getOrThrow(id));
    if (before.activeFacultyCount > 0) {
      throw new AppError(409, 'DEPARTMENT_HAS_ACTIVE_FACULTY', 'Cannot delete a department that still has active faculty');
    }
    if ((await prisma.faculty.count({ where: { departmentId: id } })) > 0) {
      throw new AppError(409, 'DEPARTMENT_HAS_HISTORY', 'Department has inactive faculty with history and cannot be deleted');
    }
    await prisma.department.delete({ where: { id } });
    return before;
  },

  /** One HOD per department; the HOD must be an active member. Roles follow the assignment. */
  async assignHod(id: string, facultyId: string | null) {
    const before = shape(await getOrThrow(id));
    const current = await prisma.department.findUnique({ where: { id }, select: { hod: { select: { userId: true } } } });

    let newUserId: string | null = null;
    if (facultyId) {
      const f = await prisma.faculty.findUnique({ where: { id: facultyId } });
      if (!f) throw new AppError(404, 'FACULTY_NOT_FOUND', 'Faculty not found');
      if (f.departmentId !== id) throw new AppError(409, 'FACULTY_NOT_IN_DEPARTMENT', 'Faculty belongs to another department');
      if (f.status !== 'ACTIVE') throw new AppError(409, 'FACULTY_INACTIVE', 'An inactive faculty member cannot be HOD');
      newUserId = f.userId;
    }
    await prisma.$transaction(async (tx) => {
      if (current?.hod && current.hod.userId !== newUserId) {
        await tx.user.update({ where: { id: current.hod.userId }, data: { role: 'FACULTY' } });
      }
      await tx.department.update({ where: { id }, data: { hodId: facultyId } });
      if (newUserId) await tx.user.update({ where: { id: newUserId }, data: { role: 'HOD' } });
    });
    return { before, after: shape(await getOrThrow(id)) };
  },
};
