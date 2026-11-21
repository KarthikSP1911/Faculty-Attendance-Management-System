import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db';
import { disconnect, resetDb } from '../helpers/db';
import { agentFor, seedBase, type Agent } from '../helpers/fixtures';

const app = createApp({ authRateLimit: 1000 });
let w: Awaited<ReturnType<typeof seedBase>>;
let admin: Agent;
let hod: Agent;
let fac: Agent;

beforeAll(async () => {
  await resetDb();
  w = await seedBase();
  admin = await agentFor(app, 'admin@t.test');
  hod = await agentFor(app, 'hod.cse@t.test');
  fac = await agentFor(app, 'fac.cse@t.test');
});
afterAll(disconnect);

describe('shifts and rules (REQ-RULE-01)', () => {
  it('lists the default shift for any authenticated user', async () => {
    expect((await request(app).get('/api/v1/shifts')).status).toBe(401);
    const res = await fac.get('/api/v1/shifts');
    expect(res.body.data[0]).toMatchObject({ startTime: '09:00', endTime: '17:00', workingDays: [1, 2, 3, 4, 5, 6], isDefault: true });
  });

  it('updates a shift (admin) and audits it', async () => {
    const res = await admin.put(`/api/v1/shifts/${w.shift.id}`).send({ name: 'General Shift', startTime: '08:30', endTime: '16:30', workingDays: [6, 1, 2, 3, 4, 5] });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ startTime: '08:30', workingDays: [1, 2, 3, 4, 5, 6] });
    expect(await prisma.auditLog.count({ where: { entity: 'Shift', action: 'UPDATE' } })).toBe(1);
    await admin.put(`/api/v1/shifts/${w.shift.id}`).send({ name: 'General Shift', startTime: '09:00', endTime: '17:00', workingDays: [1, 2, 3, 4, 5, 6] });
  });

  it.each([
    [{ name: 'S', startTime: '09:00', endTime: '17:00', workingDays: [1] }],
    [{ name: 'Shift', startTime: '17:00', endTime: '09:00', workingDays: [1] }],
    [{ name: 'Shift', startTime: '09:00', endTime: '17:00', workingDays: [0] }],
    [{ name: 'Shift', startTime: '9am', endTime: '17:00', workingDays: [1] }],
  ])('rejects invalid shift %j (400)', async (body) => {
    expect((await admin.put(`/api/v1/shifts/${w.shift.id}`).send(body)).status).toBe(400);
  });

  it('enforces access and existence on shift updates', async () => {
    const body = { name: 'General Shift', startTime: '09:00', endTime: '17:00', workingDays: [1, 2] };
    expect((await hod.put(`/api/v1/shifts/${w.shift.id}`).send(body)).status).toBe(403);
    expect((await admin.put('/api/v1/shifts/nope').send(body)).status).toBe(404);
  });

  it('reads the default 15-minute grace and updates it within 0-60', async () => {
    expect((await fac.get('/api/v1/rules')).body.data.graceMinutes).toBe(15);
    for (const n of [0, 30, 60]) {
      const res = await admin.put('/api/v1/rules').send({ graceMinutes: n });
      expect(res.status).toBe(200);
      expect(res.body.data.graceMinutes).toBe(n);
    }
    for (const n of [-1, 61, 5.5, 'x']) expect((await admin.put('/api/v1/rules').send({ graceMinutes: n })).status).toBe(400);
    expect((await hod.put('/api/v1/rules').send({ graceMinutes: 10 })).status).toBe(403);
    await admin.put('/api/v1/rules').send({ graceMinutes: 15 });
  });

  it('creates a rules row on first read when none exists', async () => {
    await prisma.attendanceRule.deleteMany();
    expect((await admin.get('/api/v1/rules')).body.data.graceMinutes).toBe(15);
  });
});

describe('holidays (REQ-HOL-01, REQ-HOL-02)', () => {
  const holiday = { date: '2026-12-25', name: 'Christmas', type: 'NATIONAL' };
  let id: string;

  it('is readable by every role but writable by admin only', async () => {
    expect((await request(app).get('/api/v1/holidays')).status).toBe(401);
    expect((await fac.get('/api/v1/holidays')).status).toBe(200);
    for (const a of [hod, fac]) expect((await a.post('/api/v1/holidays').send(holiday)).status).toBe(403);
  });

  it('creates, lists, updates and deletes with audit entries', async () => {
    const created = await admin.post('/api/v1/holidays').send(holiday);
    expect(created.status).toBe(201);
    id = created.body.data.id;
    expect(created.body.data).toMatchObject(holiday);

    const upd = await admin.put(`/api/v1/holidays/${id}`).send({ ...holiday, name: 'Christmas Day', type: 'INSTITUTIONAL' });
    expect(upd.body.data).toMatchObject({ name: 'Christmas Day', type: 'INSTITUTIONAL' });

    expect((await admin.delete(`/api/v1/holidays/${id}`)).status).toBe(204);
    expect((await admin.delete(`/api/v1/holidays/${id}`)).status).toBe(404);
    const actions = (await prisma.auditLog.findMany({ where: { entity: 'Holiday' }, orderBy: { createdAt: 'asc' } })).map((l) => l.action);
    expect(actions).toEqual(['CREATE', 'UPDATE', 'DELETE']);
  });

  it('rejects duplicate dates (409) and invalid input (400)', async () => {
    await admin.post('/api/v1/holidays').send(holiday);
    expect((await admin.post('/api/v1/holidays').send(holiday)).status).toBe(409);
    const other = (await admin.post('/api/v1/holidays').send({ ...holiday, date: '2026-12-26', name: 'Boxing Day' })).body.data.id;
    expect((await admin.put(`/api/v1/holidays/${other}`).send(holiday)).status).toBe(409);
    expect((await admin.put('/api/v1/holidays/nope').send(holiday)).status).toBe(404);
    for (const bad of [{ ...holiday, date: '2026-02-30' }, { ...holiday, name: 'X' }, { ...holiday, type: 'OTHER' }, {}]) {
      expect((await admin.post('/api/v1/holidays').send(bad)).status).toBe(400);
    }
  });

  it('filters the calendar by year and month', async () => {
    await admin.post('/api/v1/holidays').send({ date: '2027-01-26', name: 'Republic Day', type: 'NATIONAL' });
    expect((await fac.get('/api/v1/holidays?year=2027')).body.data.map((h: { name: string }) => h.name)).toEqual(['Republic Day']);
    expect((await fac.get('/api/v1/holidays?year=2026&month=12')).body.data).toHaveLength(2);
    expect((await fac.get('/api/v1/holidays?year=2026&month=11')).body.data).toHaveLength(0);
    expect((await fac.get('/api/v1/holidays')).body.data.length).toBe(3);
    expect((await fac.get('/api/v1/holidays?month=13')).status).toBe(400);
  });
});
