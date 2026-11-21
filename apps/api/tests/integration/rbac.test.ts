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
let inactiveToken: Agent;

type Call = { method: 'get' | 'post' | 'put' | 'patch' | 'delete'; path: (w: Awaited<ReturnType<typeof seedBase>>) => string; body?: object };

// Every endpoint that only an admin may call.
const adminOnly: Call[] = [
  { method: 'post', path: () => '/api/v1/departments', body: { name: 'Maths', code: 'MATH' } },
  { method: 'put', path: (x) => `/api/v1/departments/${x.cse.id}`, body: { name: 'Computer Science', code: 'CSE' } },
  { method: 'put', path: (x) => `/api/v1/departments/${x.cse.id}/hod`, body: { facultyId: null } },
  { method: 'delete', path: (x) => `/api/v1/departments/${x.ece.id}` },
  { method: 'post', path: () => '/api/v1/faculty', body: {} },
  { method: 'post', path: () => '/api/v1/faculty/import', body: { csv: 'x' } },
  { method: 'put', path: (x) => `/api/v1/faculty/${x.facCse.faculty.id}`, body: { fullName: 'Valid Name' } },
  { method: 'patch', path: (x) => `/api/v1/faculty/${x.facCse.faculty.id}/status`, body: { status: 'ACTIVE' } },
  { method: 'delete', path: (x) => `/api/v1/faculty/${x.facCse.faculty.id}` },
  { method: 'put', path: (x) => `/api/v1/shifts/${x.shift.id}`, body: {} },
  { method: 'put', path: () => '/api/v1/rules', body: { graceMinutes: 10 } },
  { method: 'post', path: () => '/api/v1/holidays', body: {} },
  { method: 'put', path: () => '/api/v1/holidays/x', body: {} },
  { method: 'delete', path: () => '/api/v1/holidays/x' },
];

beforeAll(async () => {
  await resetDb();
  w = await seedBase();
  admin = await agentFor(app, 'admin@t.test');
  hod = await agentFor(app, 'hod.cse@t.test');
  fac = await agentFor(app, 'fac.cse@t.test');
});
afterAll(disconnect);

describe('authentication required (REQ-RBAC-01)', () => {
  it.each(adminOnly.map((c) => [`${c.method.toUpperCase()} ${c.path({ cse: { id: 'x' }, ece: { id: 'x' }, shift: { id: 'x' }, facCse: { faculty: { id: 'x' } } } as never)}`, c] as const))(
    '%s -> 401 without a session',
    async (_name, c) => {
      const res = await request(app)[c.method](c.path(w)).send(c.body);
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHENTICATED' } });
    },
  );

  it('rejects a tampered or expired access token', async () => {
    const res = await request(app).get('/api/v1/departments').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });
});

describe('admin-only endpoints (REQ-RBAC-01)', () => {
  it.each(adminOnly.map((c, i) => [`#${i + 1} ${c.method.toUpperCase()}`, c] as const))('%s -> 403 for faculty and HOD', async (_n, c) => {
    for (const agent of [fac, hod]) {
      const res = await agent[c.method](c.path(w)).send(c.body);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('denied calls leave no audit trail and change nothing', async () => {
    expect(await prisma.auditLog.count()).toBe(0);
    expect(await prisma.department.count()).toBe(2);
  });
});

describe('data isolation (REQ-RBAC-02, REQ-RBAC-03)', () => {
  it('a faculty member cannot read colleagues in the same or another department', async () => {
    expect((await fac.get(`/api/v1/faculty/${w.hodCse.faculty.id}`)).status).toBe(403);
    expect((await fac.get(`/api/v1/faculty/${w.facEce.faculty.id}`)).status).toBe(403);
    expect((await fac.get('/api/v1/faculty')).status).toBe(403);
  });

  it('an HOD cannot read another department and sees only their own in lists', async () => {
    expect((await hod.get(`/api/v1/faculty/${w.facEce.faculty.id}`)).status).toBe(403);
    expect((await hod.get(`/api/v1/faculty/${w.hodEce.faculty.id}`)).status).toBe(403);
    const list = await hod.get('/api/v1/faculty?pageSize=50');
    expect(list.body.data.items.map((f: { department: { code: string } }) => f.department.code)).toEqual(['CSE', 'CSE']);
  });

  it('an admin can read every department', async () => {
    const list = await admin.get('/api/v1/faculty?pageSize=50');
    expect(list.body.data.total).toBe(4);
  });
});

describe('role changes take effect immediately', () => {
  it('a demoted HOD loses HOD-only list access on the next request', async () => {
    const other = await agentFor(app, 'hod.ece@t.test');
    expect((await other.get('/api/v1/faculty')).status).toBe(200);
    await prisma.user.update({ where: { id: w.hodEce.user.id }, data: { role: 'FACULTY' } });
    expect((await other.get('/api/v1/faculty')).status).toBe(403);
  });

  it('a deactivated user is refused even with a valid token', async () => {
    inactiveToken = await agentFor(app, 'fac.ece@t.test');
    await prisma.user.update({ where: { id: w.facEce.user.id }, data: { isActive: false } });
    const res = await inactiveToken.get('/api/v1/departments');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });
});
