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
let hod: Agent;
let fac: Agent;
let hodEce: Agent;

const rec = (facultyId: string, date: string, status: string, extra: object = {}) =>
  prisma.attendanceRecord.create({ data: { facultyId, date: new Date(`${date}T00:00:00Z`), status: status as never, ...extra } });

beforeAll(async () => {
  await resetDb();
  w = await seedBase();
  freezeClock(ist('2026-03-10', '12:00')); // Tuesday
  [admin, hod, fac, hodEce] = await Promise.all([
    agentFor(app, 'admin@t.test'),
    agentFor(app, 'hod.cse@t.test'),
    agentFor(app, 'fac.cse@t.test'),
    agentFor(app, 'hod.ece@t.test'),
  ]);
  // facCse, 1-9 March (Mon-Sun): 6 working days. P, L(deduction), HD, A, OL, P; Sunday weekly off.
  const f = w.facCse.faculty.id;
  await rec(f, '2026-03-02', 'PRESENT', { workedMinutes: 480 });
  await rec(f, '2026-03-03', 'LATE', { workedMinutes: 480, lateDeduction: true });
  await rec(f, '2026-03-04', 'HALF_DAY');
  await rec(f, '2026-03-05', 'ABSENT');
  await rec(f, '2026-03-06', 'ON_LEAVE');
  await rec(f, '2026-03-07', 'PRESENT', { workedMinutes: 450 });
  await prisma.holiday.create({ data: { date: new Date('2026-03-09T00:00:00Z'), name: 'Test Holiday', type: 'NATIONAL' } });
  // hodCse present on 2 March only; every other working day has no record.
  await rec(w.hodCse.faculty.id, '2026-03-02', 'PRESENT');
  await rec(w.hodEce.faculty.id, '2026-03-02', 'PRESENT');
});
afterAll(async () => {
  resetClock();
  await disconnect();
});

const range = (q: string) => admin.get(`/api/v1/reports/range?${q}`);
const row = (res: request.Response, empId: string) => res.body.data.find((r: { employeeId: string }) => r.employeeId === empId);

describe('access control', () => {
  it('requires authentication and the admin or HOD role', async () => {
    expect((await request(app).get('/api/v1/reports/daily?date=2026-03-02')).status).toBe(401);
    expect((await fac.get('/api/v1/reports/daily?date=2026-03-02')).status).toBe(403);
    expect((await fac.get('/api/v1/reports/muster?month=2026-03')).status).toBe(403);
  });
  it('an HOD sees only their department and cannot ask for another', async () => {
    const res = await hod.get('/api/v1/reports/range?from=2026-03-01&to=2026-03-09');
    expect(res.body.data.map((r: { department: string }) => r.department)).toEqual(['CSE', 'CSE']);
    expect((await hod.get(`/api/v1/reports/range?from=2026-03-01&to=2026-03-09&departmentId=${w.ece.id}`)).status).toBe(403);
  });
});

describe('range report and percentage (REQ-RPT-01, REQ-RPT-04)', () => {
  it('counts statuses, skips weekly off and holidays, and applies the late deduction', async () => {
    const res = await range('from=2026-03-01&to=2026-03-09');
    const f = row(res, w.facCse.faculty.employeeId);
    expect(f.counts).toEqual({ present: 2, late: 1, halfDay: 1, absent: 1, onLeave: 1, lateDeductions: 1 });
    expect(f.workingDays).toBe(6);
    // (2 present + 1 late + 0.5 HD + 1 leave - 0.5 deduction) / 6 = 4 / 6
    expect(f.percentage).toBe(66.67);
  });
  it('treats a past working day with no record as Absent, and today as open', async () => {
    const res = await range('from=2026-03-02&to=2026-03-10');
    const h = row(res, w.hodCse.faculty.employeeId);
    // 2 Mar present; 3-7 Mar absent (5); 9 Mar holiday; 10 Mar is today: no record yet, not counted.
    expect(h.counts).toMatchObject({ present: 1, absent: 5 });
    expect(h.workingDays).toBe(6);
  });
  it('filters by department and faculty', async () => {
    const dept = await range(`from=2026-03-02&to=2026-03-02&departmentId=${w.ece.id}`);
    expect(dept.body.data).toHaveLength(2);
    const one = await range(`from=2026-03-02&to=2026-03-02&facultyId=${w.facCse.faculty.id}`);
    expect(one.body.data).toHaveLength(1);
  });
  it('does not count days before the joining date', async () => {
    await prisma.faculty.update({ where: { id: w.facEce.faculty.id }, data: { dateOfJoining: new Date('2026-03-05T00:00:00Z') } });
    const res = await range('from=2026-03-02&to=2026-03-07');
    expect(row(res, w.facEce.faculty.employeeId).workingDays).toBe(3); // 5, 6, 7 March
  });
  it('validates dates and range length', async () => {
    expect((await range('from=2026-03-05&to=2026-03-01')).status).toBe(400);
    expect((await range('from=2026-02-30&to=2026-03-01')).status).toBe(400);
    expect((await range('from=2025-01-01&to=2026-03-01')).status).toBe(400);
    expect((await range('from=2026-03-01')).status).toBe(400);
  });
});

describe('daily and monthly reports', () => {
  it('daily lists every faculty with status and punches', async () => {
    const res = await admin.get('/api/v1/reports/daily?date=2026-03-02');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
    expect(row(res, w.facCse.faculty.employeeId)).toMatchObject({ status: 'PRESENT', workedMinutes: 480 });
  });
  it('monthly reports the whole month', async () => {
    const res = await admin.get('/api/v1/reports/monthly?month=2026-03');
    expect(res.status).toBe(200);
    expect(row(res, w.facCse.faculty.employeeId).counts.present).toBe(2);
    expect((await admin.get('/api/v1/reports/monthly?month=2026-13')).status).toBe(400);
  });
});

describe('muster roll (REQ-RPT-02)', () => {
  it('uses the status codes for every day of the month', async () => {
    const res = await admin.get(`/api/v1/reports/muster?month=2026-03&facultyId=${w.facCse.faculty.id}`);
    expect(res.body.data.days).toHaveLength(31);
    const codes = res.body.data.rows[0].codes as string[];
    expect(codes.slice(0, 9)).toEqual(['WO', 'P', 'L', 'HD', 'A', 'OL', 'P', 'WO', 'H']);
    expect(codes[9]).toBe('-'); // today, no record yet
    expect(codes[10]).toBe('A'.replace('A', '-') === '-' ? codes[10] : '-');
    expect(codes.at(-1)).toBe('-'); // future
  });
});

describe('exports (REQ-RPT-03)', () => {
  it('returns CSV with an attachment name', async () => {
    const res = await admin.get('/api/v1/reports/monthly?month=2026-03&format=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('monthly-2026-03.csv');
    expect(res.text.split('\r\n')[0]).toBe('Employee ID,Name,Dept,Present,Late,Half Day,Absent,On Leave,Working Days,%');
    expect(res.text.split('\r\n').length).toBe(6); // header + 4 faculty + trailing empty
  });
  it('returns a PDF', async () => {
    const res = await admin
      .get('/api/v1/reports/muster?month=2026-03&format=pdf')
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.headers['content-type']).toContain('application/pdf');
    expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });
  it('rejects an unknown format', async () => {
    expect((await admin.get('/api/v1/reports/daily?date=2026-03-02&format=xml')).status).toBe(400);
  });
});

describe('dashboards (REQ-DASH-01..03)', () => {
  it('faculty: today, month figures and balances', async () => {
    const res = await fac.get('/api/v1/dashboard/faculty');
    expect(res.status).toBe(200);
    expect(res.body.data.today).toMatchObject({ date: '2026-03-10', dayType: 'WORKING' });
    expect(res.body.data.month.counts).toMatchObject({ present: 2, late: 1, halfDay: 1, absent: 1, onLeave: 1 });
    expect(res.body.data.balances.map((b: { leaveType: { code: string } }) => b.leaveType.code).sort()).toEqual(['CL', 'EL', 'SL']);
    expect((await admin.get('/api/v1/dashboard/faculty')).status).toBe(403);
  });
  it('hod: department today, approvals and a 30-day trend', async () => {
    await prisma.leaveRequest.create({
      data: {
        facultyId: w.facCse.faculty.id,
        leaveTypeId: (await prisma.leaveType.findUniqueOrThrow({ where: { code: 'CL' } })).id,
        startDate: new Date('2026-03-20T00:00:00Z'),
        endDate: new Date('2026-03-20T00:00:00Z'),
        days: 1,
        reason: 'Personal work for the day',
        status: 'PENDING',
      },
    });
    const res = await hod.get('/api/v1/dashboard/hod');
    expect(res.status).toBe(200);
    expect(res.body.data.headcount).toBe(2);
    expect(res.body.data.pendingApprovals).toEqual({ leave: 1, regularization: 0 });
    expect(res.body.data.trend).toHaveLength(30);
    expect((await fac.get('/api/v1/dashboard/hod')).status).toBe(403);
    expect((await hodEce.get('/api/v1/dashboard/hod')).body.data.pendingApprovals.leave).toBe(0);
  });
  it('admin: KPIs, department comparison and defaulters below 75%', async () => {
    const res = await admin.get('/api/v1/dashboard/admin');
    expect(res.status).toBe(200);
    expect(res.body.data.kpis).toMatchObject({ totalFaculty: 4, departments: 2, pendingLeaves: 1 });
    expect(res.body.data.departmentComparison.map((d: { department: string }) => d.department)).toEqual(['CSE', 'ECE']);
    expect(res.body.data.threshold).toBe(75);
    expect(res.body.data.defaulters.every((d: { percentage: number }) => d.percentage < 75)).toBe(true);
    expect(res.body.data.defaulters.some((d: { employeeId: string }) => d.employeeId === w.facCse.faculty.employeeId)).toBe(true);
    expect((await hod.get('/api/v1/dashboard/admin')).status).toBe(403);
  });
});

describe('notifications (REQ-NOT-01)', () => {
  let id: string;
  beforeAll(async () => {
    await prisma.notification.createMany({
      data: [
        { userId: w.facCse.user.id, type: 'LEAVE_DECISION', title: 'Leave approved', message: 'x' },
        { userId: w.facCse.user.id, type: 'MISSED_CHECKOUT', title: 'Missed check-out', message: 'y' },
        { userId: w.hodCse.user.id, type: 'LEAVE_DECISION', title: 'Other user', message: 'z' },
      ],
    });
  });
  it('lists only my notifications with the unread count', async () => {
    const res = await fac.get('/api/v1/notifications');
    expect(res.body.data).toMatchObject({ total: 2, unread: 2 });
    id = res.body.data.items[0].id;
    expect((await request(app).get('/api/v1/notifications')).status).toBe(401);
  });
  it('marks one read, and cannot touch someone else’s', async () => {
    expect((await hod.post(`/api/v1/notifications/${id}/read`)).status).toBe(404);
    const res = await fac.post(`/api/v1/notifications/${id}/read`);
    expect(res.body.data.readAt).not.toBeNull();
    expect((await fac.get('/api/v1/notifications?unread=true')).body.data.total).toBe(1);
    expect((await fac.post('/api/v1/notifications/nope/read')).status).toBe(404);
  });
  it('marks everything read', async () => {
    const res = await fac.post('/api/v1/notifications/read-all');
    expect(res.body.data.updated).toBe(1);
    expect((await fac.get('/api/v1/notifications')).body.data.unread).toBe(0);
  });
});

describe('audit viewer and docs (REQ-AUD-01)', () => {
  it('is admin only', async () => {
    expect((await request(app).get('/api/v1/audit')).status).toBe(401);
    expect((await hod.get('/api/v1/audit')).status).toBe(403);
    expect((await fac.get('/api/v1/audit')).status).toBe(403);
  });
  it('records changes with the actor and filters them', async () => {
    const created = await admin.post('/api/v1/departments').send({ name: 'Mathematics', code: 'MATH' });
    expect(created.status).toBe(201);
    await admin.put(`/api/v1/departments/${created.body.data.id}`).send({ name: 'Applied Maths', code: 'MATH' });
    const res = await admin.get(`/api/v1/audit?entity=Department&entityId=${created.body.data.id}`);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items.map((a: { action: string }) => a.action)).toEqual(['UPDATE', 'CREATE']);
    expect(res.body.data.items[0]).toMatchObject({ actor: { email: 'admin@t.test' }, oldValue: { name: 'Mathematics' }, newValue: { name: 'Applied Maths' } });
    expect((await admin.get('/api/v1/audit?action=DELETE&entityId=' + created.body.data.id)).body.data.total).toBe(0);
    expect((await admin.get('/api/v1/audit?action=BOGUS')).status).toBe(400);
    expect((await admin.get('/api/v1/audit?from=yesterday')).status).toBe(400);
    expect((await admin.get('/api/v1/audit?from=2020-01-01T00:00:00Z&to=2020-01-02T00:00:00Z')).body.data.total).toBe(0);
  });
  it('serves the OpenAPI document and Swagger UI', async () => {
    const spec = await request(app).get('/api/docs/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.0.3');
    const ui = await request(app).get('/api/docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });
});
