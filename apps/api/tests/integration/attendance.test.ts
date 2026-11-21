import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db';
import { freezeClock, resetClock } from '../../src/utils/clock';
import { disconnect, resetDb } from '../helpers/db';
import { agentFor, createFaculty, seedBase, type Agent } from '../helpers/fixtures';
import { ist } from '../helpers/time';

const app = createApp({ authRateLimit: 1000 });
const MON = '2026-03-02';
const TUE = '2026-03-03';
const WED = '2026-03-04';
const SAT = '2026-03-07';
const SUN = '2026-03-08';

let w: Awaited<ReturnType<typeof seedBase>>;
let admin: Agent;
let fac: Agent;
let hod: Agent;
const at = (date: string, time: string) => freezeClock(ist(date, time));

beforeAll(async () => {
  await resetDb();
  w = await seedBase();
  admin = await agentFor(app, 'admin@t.test');
  fac = await agentFor(app, 'fac.cse@t.test');
  hod = await agentFor(app, 'hod.cse@t.test');
});
afterAll(async () => {
  resetClock();
  await disconnect();
});

describe('check-in and check-out (REQ-ATT-01, REQ-ATT-04, REQ-ATT-05)', () => {
  it('requires authentication', async () => {
    expect((await request(app).post('/api/v1/attendance/check-in')).status).toBe(401);
    expect((await request(app).post('/api/v1/attendance/check-out')).status).toBe(401);
    expect((await request(app).get('/api/v1/attendance/today')).status).toBe(401);
  });

  it('an admin has no faculty profile to check in with', async () => {
    at(MON, '09:00');
    const res = await admin.post('/api/v1/attendance/check-in');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NO_FACULTY_PROFILE');
  });

  it('checks in using the server clock and ignores any client time', async () => {
    at(MON, '09:10');
    const res = await fac.post('/api/v1/attendance/check-in').send({ checkInAt: '2020-01-01T00:00:00Z', time: '06:00' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(new Date(res.body.data.checkInAt).toISOString()).toBe(ist(MON, '09:10').toISOString());
    expect(res.body.data.date).toBe(MON);
  });

  it('shows the open record on /today', async () => {
    const res = await fac.get('/api/v1/attendance/today');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ date: MON, dayType: 'WORKING', onLeave: null, record: { status: 'PENDING' } });
  });

  it('a second check-in the same day is refused', async () => {
    at(MON, '09:30');
    const res = await fac.post('/api/v1/attendance/check-in');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_CHECKED_IN');
  });

  it('check-out in the same minute as check-in is refused', async () => {
    at(MON, '09:10');
    const res = await fac.post('/api/v1/attendance/check-out');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CHECKOUT_BEFORE_CHECKIN');
  });

  it('checks out and computes a Present day', async () => {
    at(MON, '17:10');
    const res = await fac.post('/api/v1/attendance/check-out');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'PRESENT', workedMinutes: 480, lateDeduction: false });
  });

  it('a second check-out is refused', async () => {
    at(MON, '17:20');
    const res = await fac.post('/api/v1/attendance/check-out');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_CHECKED_OUT');
  });

  it('check-out without a check-in is refused', async () => {
    at(MON, '17:00');
    const res = await hod.post('/api/v1/attendance/check-out');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_CHECKED_IN');
  });

  it('lists the month for the signed-in faculty only', async () => {
    const res = await fac.get('/api/v1/attendance/me?month=2026-03');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ date: MON, status: 'PRESENT' });
    expect((await hod.get('/api/v1/attendance/me?month=2026-03')).body.data).toHaveLength(0);
    expect((await fac.get('/api/v1/attendance/me?month=2026-13')).status).toBe(400);
    expect((await fac.get('/api/v1/attendance/me')).status).toBe(400);
  });
});

describe('punch windows (REQ-ATT-02)', () => {
  it('refuses check-in before 07:00', async () => {
    at(TUE, '06:59');
    const res = await hod.post('/api/v1/attendance/check-in');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CHECKIN_NOT_OPEN');
  });
  it('refuses check-in after 12:00', async () => {
    at(TUE, '12:01');
    const res = await hod.post('/api/v1/attendance/check-in');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CHECKIN_CLOSED');
  });
  it('accepts check-in at exactly 12:00 and refuses check-out after 23:00', async () => {
    at(TUE, '12:00');
    expect((await hod.post('/api/v1/attendance/check-in')).status).toBe(201);
    at(TUE, '23:01');
    const res = await hod.post('/api/v1/attendance/check-out');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CHECKOUT_CLOSED');
  });
});

describe('days without check-in (REQ-ATT-03)', () => {
  it('refuses check-in on a holiday', async () => {
    await prisma.holiday.create({ data: { date: new Date(`${WED}T00:00:00Z`), name: 'Founders Day', type: 'INSTITUTIONAL' } });
    at(WED, '09:00');
    const res = await fac.post('/api/v1/attendance/check-in');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HOLIDAY');
    expect(res.body.error.message).toContain('Founders Day');
    expect((await fac.get('/api/v1/attendance/today')).body.data).toMatchObject({ dayType: 'HOLIDAY', holidayName: 'Founders Day' });
  });

  it('refuses check-in on Sunday', async () => {
    at(SUN, '09:00');
    const res = await fac.post('/api/v1/attendance/check-in');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WEEKLY_OFF');
  });

  it('allows Saturday for the default Monday-Saturday shift', async () => {
    at(SAT, '09:00');
    expect((await fac.post('/api/v1/attendance/check-in')).status).toBe(201);
  });

  it('refuses check-in during approved leave', async () => {
    const cl = await prisma.leaveType.findUniqueOrThrow({ where: { code: 'CL' } });
    await prisma.leaveRequest.create({
      data: {
        facultyId: w.facEce.faculty.id,
        leaveTypeId: cl.id,
        startDate: new Date(`${TUE}T00:00:00Z`),
        endDate: new Date(`${TUE}T00:00:00Z`),
        days: 1,
        reason: 'Family function',
        status: 'APPROVED',
      },
    });
    const ece = await agentFor(app, 'fac.ece@t.test');
    at(TUE, '09:00');
    const res = await ece.post('/api/v1/attendance/check-in');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ON_LEAVE');
  });
});

describe('late arrivals and the third-late deduction (REQ-RULE-02, REQ-RULE-06)', () => {
  let late: Agent;
  beforeAll(async () => {
    const person = await createFaculty({ email: 'late@t.test', departmentId: w.cse.id, shiftId: w.shift.id });
    expect(person.faculty.id).toBeTruthy();
    late = await agentFor(app, 'late@t.test');
  });

  const day = async (date: string, inT: string, outT: string) => {
    at(date, inT);
    expect((await late.post('/api/v1/attendance/check-in')).status).toBe(201);
    at(date, outT);
    return (await late.post('/api/v1/attendance/check-out')).body.data;
  };

  it('flags the third Late of the month as a deduction', async () => {
    const first = await day('2026-04-06', '09:16', '17:20');
    const second = await day('2026-04-07', '10:30', '18:30');
    const third = await day('2026-04-08', '09:45', '17:50');
    expect([first.status, second.status, third.status]).toEqual(['LATE', 'LATE', 'LATE']);
    expect([first.lateDeduction, second.lateDeduction, third.lateDeduction]).toEqual([false, false, true]);
  });

  it('an arrival after 10:30 is a Half Day and not counted as Late', async () => {
    const r = await day('2026-04-09', '10:31', '18:40');
    expect(r.status).toBe('HALF_DAY');
    expect(r.lateDeduction).toBe(false);
  });

  it('a short day is a Half Day and under four hours is Absent', async () => {
    expect((await day('2026-04-10', '09:00', '14:00')).status).toBe('HALF_DAY');
    expect((await day('2026-04-11', '09:00', '12:59')).status).toBe('ABSENT');
  });
});

describe('absent job (REQ-RULE-04)', () => {
  it('only an admin can trigger it, and not for the future', async () => {
    at('2026-05-05', '23:59');
    expect((await fac.post('/api/v1/attendance/jobs/absent').send({})).status).toBe(403);
    expect((await request(app).post('/api/v1/attendance/jobs/absent').send({})).status).toBe(401);
    const future = await admin.post('/api/v1/attendance/jobs/absent').send({ date: '2026-05-06' });
    expect(future.status).toBe(400);
    expect(future.body.error.code).toBe('FUTURE_DATE');
    expect((await admin.post('/api/v1/attendance/jobs/absent').send({ date: '2026-02-30' })).status).toBe(400);
  });

  it('marks absentees, leave and missed check-outs, and is safe to run twice', async () => {
    // Tuesday 2026-05-05: hod checked in only, fac.ece is on leave, everyone else did nothing.
    await prisma.attendanceRecord.deleteMany({});
    const cl = await prisma.leaveType.findUniqueOrThrow({ where: { code: 'CL' } });
    await prisma.leaveRequest.create({
      data: {
        facultyId: w.facEce.faculty.id,
        leaveTypeId: cl.id,
        startDate: new Date('2026-05-05T00:00:00Z'),
        endDate: new Date('2026-05-05T00:00:00Z'),
        days: 1,
        reason: 'Medical appointment',
        status: 'APPROVED',
      },
    });
    at('2026-05-05', '09:00');
    expect((await hod.post('/api/v1/attendance/check-in')).status).toBe(201);

    at('2026-05-05', '23:59');
    const res = await admin.post('/api/v1/attendance/jobs/absent').send({});
    expect(res.status).toBe(200);
    const total = await prisma.faculty.count({ where: { status: 'ACTIVE' } });
    expect(res.body.data).toMatchObject({ date: '2026-05-05', closedMissedCheckOut: 1, markedOnLeave: 1 });
    expect(res.body.data.markedAbsent).toBe(total - 2);

    const hodRecord = await prisma.attendanceRecord.findFirstOrThrow({ where: { facultyId: w.hodCse.faculty.id } });
    expect(hodRecord.status).toBe('HALF_DAY');
    const note = await prisma.notification.findFirst({ where: { userId: w.hodCse.user.id, type: 'MISSED_CHECKOUT' } });
    expect(note).not.toBeNull();

    const again = await admin.post('/api/v1/attendance/jobs/absent').send({});
    expect(again.body.data).toMatchObject({ markedAbsent: 0, markedOnLeave: 0, closedMissedCheckOut: 0 });
    expect(await prisma.attendanceRecord.count()).toBe(total);
  });

  it('skips holidays and weekly offs, and inactive faculty', async () => {
    await prisma.attendanceRecord.deleteMany({});
    const before = await prisma.attendanceRecord.count();
    at('2026-05-10', '23:59'); // Sunday
    const sunday = await admin.post('/api/v1/attendance/jobs/absent').send({});
    expect(sunday.body.data.markedAbsent).toBe(0);

    await prisma.holiday.create({ data: { date: new Date('2026-05-12T00:00:00Z'), name: 'Test Holiday', type: 'NATIONAL' } });
    at('2026-05-12', '23:59');
    const holiday = await admin.post('/api/v1/attendance/jobs/absent').send({});
    expect(holiday.body.data.markedAbsent).toBe(0);
    expect(await prisma.attendanceRecord.count()).toBe(before);

    await prisma.faculty.update({ where: { id: w.facEce.faculty.id }, data: { status: 'INACTIVE' } });
    at('2026-05-13', '23:59');
    const wed = await admin.post('/api/v1/attendance/jobs/absent').send({ date: '2026-05-13' });
    const active = await prisma.faculty.count({ where: { status: 'ACTIVE' } });
    expect(wed.body.data.markedAbsent).toBe(active);
  });

  it('does not mark faculty absent before their joining date', async () => {
    await prisma.attendanceRecord.deleteMany({});
    await prisma.faculty.update({ where: { id: w.facCse.faculty.id }, data: { dateOfJoining: new Date('2026-06-01T00:00:00Z') } });
    at('2026-05-14', '23:59');
    const res = await admin.post('/api/v1/attendance/jobs/absent').send({});
    const eligible = await prisma.faculty.count({ where: { status: 'ACTIVE', dateOfJoining: { lte: new Date('2026-05-14T00:00:00Z') } } });
    expect(res.body.data.markedAbsent).toBe(eligible);
  });
});
