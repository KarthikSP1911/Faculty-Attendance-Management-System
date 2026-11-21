import bcrypt from 'bcrypt';
import type { Express } from 'express';
import request from 'supertest';
import { prisma } from '../../src/db';
import { TEST_PASSWORD } from './db';

export type Agent = ReturnType<typeof request.agent>;

export async function agentFor(app: Express, email: string, password = TEST_PASSWORD): Promise<Agent> {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

let employeeCounter = 0;

export async function createFaculty(opts: {
  email: string;
  departmentId: string;
  shiftId: string;
  role?: 'FACULTY' | 'HOD';
  fullName?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}) {
  employeeCounter++;
  const user = await prisma.user.create({
    data: {
      email: opts.email,
      role: opts.role ?? 'FACULTY',
      isActive: (opts.status ?? 'ACTIVE') === 'ACTIVE',
      passwordHash: await bcrypt.hash(TEST_PASSWORD, 4),
    },
  });
  const faculty = await prisma.faculty.create({
    data: {
      employeeId: `TST-${String(employeeCounter).padStart(4, "0")}`,
      userId: user.id,
      fullName: opts.fullName ?? `Test Person ${employeeCounter}`,
      phone: '9876543210',
      departmentId: opts.departmentId,
      designation: 'LECTURER',
      dateOfJoining: new Date('2020-06-01T00:00:00Z'),
      shiftId: opts.shiftId,
      status: opts.status ?? 'ACTIVE',
    },
  });
  return { user, faculty };
}

/** Standard world: shift, rules, leave types, CSE + ECE departments, admin, one HOD and one faculty each. */
export async function seedBase() {
  const shift = await prisma.shift.create({
    data: { name: 'General Shift', workingDays: [1, 2, 3, 4, 5, 6], isDefault: true },
  });
  await prisma.attendanceRule.create({ data: {} });
  await prisma.leaveType.createMany({
    data: [
      { code: 'CL', name: 'Casual Leave', yearlyQuota: 12 },
      { code: 'SL', name: 'Sick Leave', yearlyQuota: 10 },
      { code: 'EL', name: 'Earned Leave', yearlyQuota: 15 },
      { code: 'OD', name: 'On Duty', yearlyQuota: null, requiresReason: true },
    ],
  });
  const cse = await prisma.department.create({ data: { name: 'Computer Science', code: 'CSE' } });
  const ece = await prisma.department.create({ data: { name: 'Electronics', code: 'ECE' } });
  const admin = await prisma.user.create({
    data: { email: 'admin@t.test', role: 'ADMIN', passwordHash: await bcrypt.hash(TEST_PASSWORD, 4) },
  });
  const hodCse = await createFaculty({ email: 'hod.cse@t.test', role: 'HOD', departmentId: cse.id, shiftId: shift.id });
  await prisma.department.update({ where: { id: cse.id }, data: { hodId: hodCse.faculty.id } });
  const hodEce = await createFaculty({ email: 'hod.ece@t.test', role: 'HOD', departmentId: ece.id, shiftId: shift.id });
  await prisma.department.update({ where: { id: ece.id }, data: { hodId: hodEce.faculty.id } });
  const facCse = await createFaculty({ email: 'fac.cse@t.test', departmentId: cse.id, shiftId: shift.id });
  const facEce = await createFaculty({ email: 'fac.ece@t.test', departmentId: ece.id, shiftId: shift.id });
  return { shift, cse, ece, admin, hodCse, hodEce, facCse, facEce };
}
