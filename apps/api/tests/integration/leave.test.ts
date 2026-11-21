import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db';
import { freezeClock, resetClock } from '../../src/utils/clock';
import { disconnect, resetDb } from '../helpers/db';
import { agentFor, seedBase, type Agent } from '../helpers/fixtures';
import { ist } from '../helpers/time';

const app = createApp({ authRateLimit: 1000 });
let w: Awaited<ReturnType<typeof seedBase>>;
let admin: Agent;
let fac: Agent;
let hod: Agent;
let hodEce: Agent;
let facEce: Agent;
let cl: string;
let od: string;

const body = (over: object = {}) => ({
  leaveTypeId: cl,
  startDate: '2026-03-09',
  endDate: '2026-03-10',
  halfDay: 'NONE',
  reason: 'Family function out of town',
  ...over,
});
const balance = async (agent: Agent, code = 'CL') => {
  const res = await agent.get('/api/v1/leave/balances?year=2026');
  return res.body.data.find((b: { leaveType: { code: string } }) => b.leaveType.code === code);
};

beforeAll(async () => {
  await resetDb();
  w = await seedBase();
  freezeClock(ist('2026-03-02', '10:00'));
  [admin, fac, hod, hodEce, facEce] = await Promise.all([
    agentFor(app, 'admin@t.test'),
    agentFor(app, 'fac.cse@t.test'),
    agentFor(app, 'hod.cse@t.test'),
    agentFor(app, 'hod.ece@t.test'),
    agentFor(app, 'fac.ece@t.test'),
  ]);
  cl = (await prisma.leaveType.findUniqueOrThrow({ where: { code: 'CL' } })).id;
  od = (await prisma.leaveType.findUniqueOrThrow({ where: { code: 'OD' } })).id;
});
afterAll(async () => {
  resetClock();
  await disconnect();
});

describe('types and balances (REQ-LEAVE-01)', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/leave')).status).toBe(401);
    expect((await request(app).post('/api/v1/leave').send(body())).status).toBe(401);
  });
  it('lists the four types and creates yearly balances from quotas', async () => {
    expect((await fac.get('/api/v1/leave/types')).body.data.map((t: { code: string }) => t.code)).toEqual(['CL', 'EL', 'OD', 'SL']);
    const res = await fac.get('/api/v1/leave/balances?year=2026');
    const byCode = Object.fromEntries(res.body.data.map((b: { leaveType: { code: string }; allotted: number }) => [b.leaveType.code, b.allotted]));
    expect(byCode).toEqual({ CL: 12, SL: 10, EL: 15 });
  });
  it('limits who can read another balance', async () => {
    expect((await fac.get(`/api/v1/leave/balances?facultyId=${w.facEce.faculty.id}`)).status).toBe(403);
    expect((await hod.get(`/api/v1/leave/balances?facultyId=${w.facEce.faculty.id}`)).status).toBe(403);
    expect((await hod.get(`/api/v1/leave/balances?facultyId=${w.facCse.faculty.id}`)).status).toBe(200);
    expect((await admin.get(`/api/v1/leave/balances?facultyId=${w.facEce.faculty.id}`)).status).toBe(200);
    expect((await admin.get('/api/v1/leave/balances')).status).toBe(403);
  });
});

describe('applying (REQ-LEAVE-02, REQ-LEAVE-03)', () => {
  it('rejects invalid input with field details', async () => {
    const res = await fac.post('/api/v1/leave').send(body({ endDate: '2026-03-08', reason: 'short' }));
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(expect.arrayContaining(['reason', 'endDate']));
    expect((await fac.post('/api/v1/leave').send(body({ leaveTypeId: 'nope' }))).status).toBe(400);
    expect((await fac.post('/api/v1/leave').send({})).status).toBe(400);
  });
  it('an admin has no faculty profile to apply with', async () => {
    expect((await admin.post('/api/v1/leave').send(body())).status).toBe(403);
  });
  it('creates a pending request counting working days (Sunday excluded)', async () => {
    const res = await fac.post('/api/v1/leave').send(body({ startDate: '2026-03-14', endDate: '2026-03-16' }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'PENDING', days: 2, leaveType: { code: 'CL' } });
    await fac.post(`/api/v1/leave/${res.body.data.id}/cancel`);
  });
  it('refuses an overlapping request with 409', async () => {
    const first = await fac.post('/api/v1/leave').send(body());
    expect(first.status).toBe(201);
    const res = await fac.post('/api/v1/leave').send(body({ startDate: '2026-03-10', endDate: '2026-03-11' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LEAVE_OVERLAP');
    await fac.post(`/api/v1/leave/${first.body.data.id}/cancel`);
  });
  it('refuses a request above the balance, counting pending days', async () => {
    const big = await fac.post('/api/v1/leave').send(body({ startDate: '2026-04-06', endDate: '2026-04-18' })); // 12 days
    expect(big.status).toBe(201);
    const res = await fac.post('/api/v1/leave').send(body({ startDate: '2026-05-04', endDate: '2026-05-04' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    await fac.post(`/api/v1/leave/${big.body.data.id}/cancel`);
  });
  it('On Duty has no quota; half day counts 0.5', async () => {
    const o = await fac.post('/api/v1/leave').send(body({ leaveTypeId: od, startDate: '2026-06-01', endDate: '2026-06-01' }));
    expect(o.status).toBe(201);
    const half = await fac.post('/api/v1/leave').send(body({ startDate: '2026-06-02', endDate: '2026-06-02', halfDay: 'FIRST_HALF' }));
    expect(half.body.data.days).toBe(0.5);
    await fac.post(`/api/v1/leave/${o.body.data.id}/cancel`);
    await fac.post(`/api/v1/leave/${half.body.data.id}/cancel`);
  });
  it('saves a draft and submits it later', async () => {
    const d = await fac.post('/api/v1/leave').send(body({ startDate: '2026-07-06', endDate: '2026-07-06', draft: true }));
    expect(d.body.data.status).toBe('DRAFT');
    expect((await hod.post(`/api/v1/leave/${d.body.data.id}/submit`)).status).toBe(403);
    const s = await fac.post(`/api/v1/leave/${d.body.data.id}/submit`);
    expect(s.body.data.status).toBe('PENDING');
    expect((await fac.post(`/api/v1/leave/${d.body.data.id}/submit`)).status).toBe(409);
    await fac.post(`/api/v1/leave/${d.body.data.id}/cancel`);
  });
});

describe('review and balances (REQ-LEAVE-04, 05, 06)', () => {
  let id: string;
  it('faculty cannot approve; an HOD of another department cannot either', async () => {
    id = (await fac.post('/api/v1/leave').send(body())).body.data.id;
    expect((await fac.post(`/api/v1/leave/${id}/approve`).send({})).status).toBe(403);
    expect((await hodEce.post(`/api/v1/leave/${id}/approve`).send({})).status).toBe(403);
    expect((await hodEce.get(`/api/v1/leave/${id}`)).status).toBe(403);
    expect((await facEce.get(`/api/v1/leave/${id}`)).status).toBe(403);
  });
  it('rejecting needs a comment and notifies the faculty', async () => {
    expect((await hod.post(`/api/v1/leave/${id}/reject`).send({})).status).toBe(400);
    const other = (await fac.post('/api/v1/leave').send(body({ startDate: '2026-08-03', endDate: '2026-08-03' }))).body.data.id;
    const res = await hod.post(`/api/v1/leave/${other}/reject`).send({ comment: 'Exams that week' });
    expect(res.body.data).toMatchObject({ status: 'REJECTED', reviewComment: 'Exams that week' });
    expect((await hod.post(`/api/v1/leave/${other}/approve`).send({})).status).toBe(409);
    expect(await prisma.notification.count({ where: { userId: w.facCse.user.id, type: 'LEAVE_DECISION' } })).toBe(1);
    expect((await balance(fac)).used).toBe(0);
  });
  it('the HOD approves their own department and the balance drops', async () => {
    const res = await hod.post(`/api/v1/leave/${id}/approve`).send({ comment: 'Approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
    expect(await balance(fac)).toMatchObject({ allotted: 12, used: 2, remaining: 10 });
  });
  it('an approved future leave can be cancelled and the balance is restored', async () => {
    const res = await fac.post(`/api/v1/leave/${id}/cancel`);
    expect(res.body.data.status).toBe('CANCELLED');
    expect(await balance(fac)).toMatchObject({ used: 0, remaining: 12 });
    expect((await fac.post(`/api/v1/leave/${id}/cancel`)).status).toBe(409);
  });
  it('an approved leave that has started cannot be cancelled', async () => {
    const started = (await fac.post('/api/v1/leave').send(body({ startDate: '2026-03-02', endDate: '2026-03-02' }))).body.data.id;
    expect((await hod.post(`/api/v1/leave/${started}/approve`).send({})).status).toBe(200);
    const res = await fac.post(`/api/v1/leave/${started}/cancel`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });
  it('an HOD cannot approve their own leave but an admin can', async () => {
    const mine = (await hod.post('/api/v1/leave').send(body({ startDate: '2026-09-07', endDate: '2026-09-07' }))).body.data.id;
    expect((await hod.post(`/api/v1/leave/${mine}/approve`).send({})).status).toBe(403);
    expect((await admin.post(`/api/v1/leave/${mine}/approve`).send({})).status).toBe(200);
  });
  it('scopes the list by role and filters by status', async () => {
    const mine = await fac.get('/api/v1/leave?pageSize=50');
    expect(mine.body.data.items.every((l: { facultyId: string }) => l.facultyId === w.facCse.faculty.id)).toBe(true);
    const dept = await hod.get('/api/v1/leave?pageSize=50');
    expect(dept.body.data.total).toBeGreaterThan(mine.body.data.total - 1);
    expect((await hodEce.get('/api/v1/leave?pageSize=50')).body.data.total).toBe(0);
    const approved = await admin.get('/api/v1/leave?status=APPROVED&pageSize=50');
    expect(approved.body.data.items.every((l: { status: string }) => l.status === 'APPROVED')).toBe(true);
    expect((await admin.get('/api/v1/leave?status=BOGUS')).status).toBe(400);
  });
  it('approved leave is recorded in the audit trail', async () => {
    expect(await prisma.auditLog.count({ where: { entity: 'LeaveRequest', action: 'UPDATE' } })).toBeGreaterThan(0);
  });
});

describe('regularization (REQ-REG-01, 02, 03)', () => {
  const reg = (over: object = {}) => ({
    date: '2026-02-27',
    requestedCheckIn: '09:00',
    requestedCheckOut: '17:00',
    reason: 'Forgot to punch in and out',
    ...over,
  });
  let id: string;

  it('validates the date window and reason', async () => {
    expect((await fac.post('/api/v1/regularization').send(reg({ date: '2026-02-22' }))).status).toBe(400);
    expect((await fac.post('/api/v1/regularization').send(reg({ reason: 'short' }))).status).toBe(400);
    expect((await fac.post('/api/v1/regularization').send(reg({ date: '2026-03-03' }))).status).toBe(400);
    expect((await admin.post('/api/v1/regularization').send(reg())).status).toBe(403);
  });
  it('refuses a holiday, weekly off or leave day', async () => {
    const res = await fac.post('/api/v1/regularization').send(reg({ date: '2026-03-01' })); // Sunday
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_A_WORKING_DAY');
  });
  it('creates a request and refuses a duplicate pending one', async () => {
    const res = await fac.post('/api/v1/regularization').send(reg());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'PENDING', requestedCheckIn: '09:00', requestedCheckOut: '17:00' });
    id = res.body.data.id;
    expect((await fac.post('/api/v1/regularization').send(reg())).status).toBe(409);
  });
  it('only the department HOD or an admin can review', async () => {
    expect((await fac.post(`/api/v1/regularization/${id}/approve`).send({})).status).toBe(403);
    expect((await hodEce.post(`/api/v1/regularization/${id}/approve`).send({})).status).toBe(403);
    expect((await hod.post(`/api/v1/regularization/${id}/reject`).send({})).status).toBe(400);
  });
  it('approval creates the record, recomputes the status and audits a correction', async () => {
    const res = await hod.post(`/api/v1/regularization/${id}/approve`).send({ comment: 'Verified with register' });
    expect(res.status).toBe(200);
    const rec = await prisma.attendanceRecord.findFirstOrThrow({ where: { facultyId: w.facCse.faculty.id } });
    expect(rec).toMatchObject({ status: 'PRESENT', regularized: true, workedMinutes: 480 });
    expect(await prisma.auditLog.count({ where: { action: 'CORRECTION', entity: 'AttendanceRecord' } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: w.facCse.user.id, type: 'REGULARIZATION_DECISION' } })).toBe(1);
    expect((await hod.post(`/api/v1/regularization/${id}/approve`).send({})).status).toBe(409);
  });
  it('rejection leaves attendance unchanged', async () => {
    const r = await fac.post('/api/v1/regularization').send(reg({ date: '2026-02-26' }));
    const res = await hod.post(`/api/v1/regularization/${r.body.data.id}/reject`).send({ comment: 'No evidence' });
    expect(res.body.data.status).toBe('REJECTED');
    expect(await prisma.attendanceRecord.count()).toBe(1);
  });
  it('allows at most three requests in a month', async () => {
    const third = await fac.post('/api/v1/regularization').send(reg({ date: '2026-02-25' }));
    expect(third.status).toBe(201);
    const fourth = await fac.post('/api/v1/regularization').send(reg({ date: '2026-02-24' }));
    expect(fourth.status).toBe(409);
    expect(fourth.body.error.code).toBe('REGULARIZATION_LIMIT');
  });
  it('lists by role', async () => {
    expect((await fac.get('/api/v1/regularization')).body.data.total).toBe(3);
    expect((await hodEce.get('/api/v1/regularization')).body.data.total).toBe(0);
    expect((await admin.get('/api/v1/regularization?status=PENDING')).body.data.total).toBe(1);
  });
});
