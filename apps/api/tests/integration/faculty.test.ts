import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db';
import { TEST_PASSWORD, disconnect, resetDb } from '../helpers/db';
import { agentFor, createFaculty, seedBase, type Agent } from '../helpers/fixtures';

const app = createApp({ authRateLimit: 1000 });
const API = '/api/v1/faculty';
let w: Awaited<ReturnType<typeof seedBase>>;
let admin: Agent;
let hod: Agent;
let fac: Agent;

const valid = (over: Record<string, unknown> = {}) => ({
  fullName: 'Asha Rao',
  email: 'asha.rao@t.test',
  phone: '9876543210',
  departmentId: w.cse.id,
  designation: 'ASSISTANT_PROFESSOR',
  dateOfJoining: '2022-07-01',
  ...over,
});

beforeAll(async () => {
  await resetDb();
  w = await seedBase();
  admin = await agentFor(app, 'admin@t.test');
  hod = await agentFor(app, 'hod.cse@t.test');
  fac = await agentFor(app, 'fac.cse@t.test');
});
afterAll(disconnect);

describe('create faculty (REQ-FAC-01, REQ-FAC-02)', () => {
  it('creates a faculty member with an auto-generated employee ID, balances and a temporary password', async () => {
    const res = await admin.post(API).send(valid());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      employeeId: expect.stringMatching(/^FAC-\d{4,}$/),
      email: 'asha.rao@t.test',
      status: 'ACTIVE',
      department: { code: 'CSE' },
      dateOfJoining: '2022-07-01',
    });
    const tempPassword = res.body.data.temporaryPassword as string;
    expect(tempPassword).toBeTruthy();
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'asha.rao@t.test', password: tempPassword })).status).toBe(200);

    expect(await prisma.leaveBalance.count({ where: { facultyId: res.body.data.id } })).toBe(4);
    expect(await prisma.auditLog.count({ where: { entity: 'Faculty', entityId: res.body.data.id, action: 'CREATE' } })).toBe(1);
  });

  it('assigns consecutive employee IDs', async () => {
    const a = await admin.post(API).send(valid({ email: 'seq.a@t.test' }));
    const b = await admin.post(API).send(valid({ email: 'seq.b@t.test' }));
    const num = (r: request.Response) => Number(String(r.body.data.employeeId).slice(4));
    expect(num(b)).toBe(num(a) + 1);
  });

  it('uses a supplied password and does not echo it', async () => {
    const res = await admin.post(API).send(valid({ email: 'pw@t.test', password: 'Chosen@1234' }));
    expect(res.status).toBe(201);
    expect(res.body.data.temporaryPassword).toBeUndefined();
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'pw@t.test', password: 'Chosen@1234' })).status).toBe(200);
  });

  it('can create an inactive faculty member who cannot log in', async () => {
    const res = await admin.post(API).send(valid({ email: 'inactive.new@t.test', status: 'INACTIVE', password: TEST_PASSWORD }));
    expect(res.body.data.status).toBe('INACTIVE');
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'inactive.new@t.test', password: TEST_PASSWORD })).status).toBe(403);
  });

  it.each([
    ['short name', { fullName: 'A' }, 'fullName'],
    ['digit in name', { fullName: 'Asha 2' }, 'fullName'],
    ['bad phone', { phone: '5876543210' }, 'phone'],
    ['bad email', { email: 'nope' }, 'email'],
    ['future joining date', { dateOfJoining: '2999-01-01' }, 'dateOfJoining'],
    ['bad designation', { designation: 'DEAN' }, 'designation'],
    ['weak password', { password: 'weak' }, 'password'],
  ])('rejects %s with 400', async (_n, over, field) => {
    const res = await admin.post(API).send(valid({ email: 'v@t.test', ...over }));
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it('returns 409 for a duplicate email and 404 for unknown department or shift', async () => {
    expect((await admin.post(API).send(valid({ email: 'fac.cse@t.test' }))).status).toBe(409);
    expect((await admin.post(API).send(valid({ email: 'x1@t.test', departmentId: 'nope' }))).status).toBe(404);
    expect((await admin.post(API).send(valid({ email: 'x2@t.test', shiftId: 'nope' }))).status).toBe(404);
  });

  it('is admin only', async () => {
    expect((await hod.post(API).send(valid({ email: 'h@t.test' }))).status).toBe(403);
    expect((await fac.post(API).send(valid({ email: 'f@t.test' }))).status).toBe(403);
    expect((await request(app).post(API).send(valid())).status).toBe(401);
  });
});

describe('list, search, filter, sort, paginate (REQ-FAC-03)', () => {
  beforeAll(async () => {
    for (let i = 1; i <= 12; i++) {
      await createFaculty({
        email: `bulk${i}@t.test`,
        fullName: `Bulk Person ${String.fromCharCode(64 + i)}`,
        departmentId: i % 2 ? w.cse.id : w.ece.id,
        shiftId: w.shift.id,
      });
    }
  });

  it('paginates with 10 per page by default and reports totals', async () => {
    const p1 = await admin.get(API);
    expect(p1.status).toBe(200);
    expect(p1.body.data.items).toHaveLength(10);
    expect(p1.body.data).toMatchObject({ page: 1, pageSize: 10 });
    const total = p1.body.data.total;
    expect(p1.body.data.totalPages).toBe(Math.ceil(total / 10));
    const p2 = await admin.get(`${API}?page=2`);
    expect(p2.body.data.items.length).toBe(Math.min(10, total - 10));
    expect(p2.body.data.items[0].id).not.toBe(p1.body.data.items[0].id);
  });

  it('supports page sizes 25 and 50 only', async () => {
    expect((await admin.get(`${API}?pageSize=25`)).body.data.items.length).toBeGreaterThan(10);
    expect((await admin.get(`${API}?pageSize=50`)).status).toBe(200);
    expect((await admin.get(`${API}?pageSize=20`)).status).toBe(400);
    expect((await admin.get(`${API}?page=0`)).status).toBe(400);
  });

  it('searches by name, employee ID and email (case-insensitive)', async () => {
    const byName = await admin.get(`${API}?q=bulk person c`);
    expect(byName.body.data.items.map((f: { fullName: string }) => f.fullName)).toEqual(['Bulk Person C']);
    const byEmail = await admin.get(`${API}?q=BULK12@`);
    expect(byEmail.body.data.total).toBe(1);
    const id = byEmail.body.data.items[0].employeeId;
    expect((await admin.get(`${API}?q=${id}`)).body.data.items[0].employeeId).toBe(id);
  });

  it('filters by department and status', async () => {
    const ece = await admin.get(`${API}?departmentId=${w.ece.id}&pageSize=50`);
    expect(ece.body.data.items.every((f: { department: { code: string } }) => f.department.code === 'ECE')).toBe(true);
    const inactive = await admin.get(`${API}?status=INACTIVE`);
    expect(inactive.body.data.items.length).toBeGreaterThan(0);
    expect(inactive.body.data.items.every((f: { status: string }) => f.status === 'INACTIVE')).toBe(true);
  });

  it('sorts ascending and descending', async () => {
    const asc = (await admin.get(`${API}?sortBy=fullName&order=asc&pageSize=50`)).body.data.items.map((f: { fullName: string }) => f.fullName);
    const desc = (await admin.get(`${API}?sortBy=fullName&order=desc&pageSize=50`)).body.data.items.map((f: { fullName: string }) => f.fullName);
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)).filter(Boolean));
    expect(desc).toEqual([...asc].reverse());
    expect((await admin.get(`${API}?sortBy=password`)).status).toBe(400);
  });

  it('limits an HOD to their own department regardless of the filter', async () => {
    const res = await hod.get(`${API}?departmentId=${w.ece.id}&pageSize=50`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.every((f: { department: { code: string } }) => f.department.code === 'CSE')).toBe(true);
  });

  it('forbids faculty from listing (403)', async () => {
    expect((await fac.get(API)).status).toBe(403);
  });
});

describe('read one (REQ-RBAC-02, REQ-RBAC-03)', () => {
  it('lets a faculty member read themselves but nobody else', async () => {
    expect((await fac.get(`${API}/${w.facCse.faculty.id}`)).status).toBe(200);
    expect((await fac.get(`${API}/${w.facEce.faculty.id}`)).status).toBe(403);
    expect((await fac.get(`${API}/${w.hodCse.faculty.id}`)).status).toBe(403);
  });
  it('lets an HOD read own department only', async () => {
    expect((await hod.get(`${API}/${w.facCse.faculty.id}`)).status).toBe(200);
    expect((await hod.get(`${API}/${w.facEce.faculty.id}`)).status).toBe(403);
  });
  it('lets an admin read anyone; unknown id is 404', async () => {
    expect((await admin.get(`${API}/${w.facEce.faculty.id}`)).body.data.email).toBe('fac.ece@t.test');
    expect((await admin.get(`${API}/nope`)).status).toBe(404);
  });
});

describe('update, deactivate, delete (REQ-FAC-01, REQ-FAC-05)', () => {
  let id: string;
  beforeAll(async () => {
    id = (await admin.post(API).send(valid({ email: 'edit.me@t.test', password: TEST_PASSWORD }))).body.data.id;
  });

  it('updates fields including email and department, and audits old/new values', async () => {
    const res = await admin.put(`${API}/${id}`).send({ fullName: 'Edited Name', email: 'edited@t.test', departmentId: w.ece.id, designation: 'PROFESSOR' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ fullName: 'Edited Name', email: 'edited@t.test', designation: 'PROFESSOR', department: { code: 'ECE' } });
    const log = await prisma.auditLog.findFirstOrThrow({ where: { entity: 'Faculty', entityId: id, action: 'UPDATE' } });
    expect(log.oldValue).toMatchObject({ fullName: 'Asha Rao' });
    expect(log.newValue).toMatchObject({ fullName: 'Edited Name' });
  });

  it('validates updates and handles conflicts', async () => {
    expect((await admin.put(`${API}/${id}`).send({})).status).toBe(400);
    expect((await admin.put(`${API}/${id}`).send({ phone: '123' })).status).toBe(400);
    expect((await admin.put(`${API}/${id}`).send({ email: 'fac.cse@t.test' })).status).toBe(409);
    expect((await admin.put(`${API}/nope`).send({ fullName: 'Valid Name' })).status).toBe(404);
    expect((await admin.put(`${API}/${id}`).send({ departmentId: 'nope' })).status).toBe(404);
    expect((await admin.put(`${API}/${id}`).send({ shiftId: 'nope' })).status).toBe(404);
    expect((await hod.put(`${API}/${id}`).send({ fullName: 'Valid Name' })).status).toBe(403);
  });

  it('keeps the HOD in place: moving or deactivating or deleting an HOD is a 409', async () => {
    const hodId = w.hodCse.faculty.id;
    expect((await admin.put(`${API}/${hodId}`).send({ departmentId: w.ece.id })).status).toBe(409);
    expect((await admin.patch(`${API}/${hodId}/status`).send({ status: 'INACTIVE' })).status).toBe(409);
    expect((await admin.delete(`${API}/${hodId}`)).status).toBe(409);
  });

  it('deactivation blocks login and revokes sessions but keeps history; reactivation restores access', async () => {
    const created = await admin.post(API).send(valid({ email: 'deact@t.test', password: TEST_PASSWORD }));
    const target = created.body.data.id;
    const session = await agentFor(app, 'deact@t.test');
    await prisma.attendanceRecord.create({ data: { facultyId: target, date: new Date('2026-01-05T00:00:00Z'), status: 'PRESENT' } });

    const off = await admin.patch(`${API}/${target}/status`).send({ status: 'INACTIVE' });
    expect(off.status).toBe(200);
    expect(off.body.data.status).toBe('INACTIVE');
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'deact@t.test', password: TEST_PASSWORD })).status).toBe(403);
    expect((await session.get('/api/v1/auth/me')).status).toBe(403); // existing access token is refused
    expect((await session.post('/api/v1/auth/refresh')).status).toBe(401); // refresh token was revoked
    expect(await prisma.attendanceRecord.count({ where: { facultyId: target } })).toBe(1); // history kept

    expect((await admin.patch(`${API}/${target}/status`).send({ status: 'ACTIVE' })).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'deact@t.test', password: TEST_PASSWORD })).status).toBe(200);
    expect((await admin.patch(`${API}/${target}/status`).send({ status: 'BAD' })).status).toBe(400);
    expect((await admin.patch(`${API}/nope/status`).send({ status: 'ACTIVE' })).status).toBe(404);
  });

  it('refuses to delete faculty with history (409) but deletes a clean record', async () => {
    const withHistory = (await admin.post(API).send(valid({ email: 'hist@t.test' }))).body.data.id;
    await prisma.attendanceRecord.create({ data: { facultyId: withHistory, date: new Date('2026-01-06T00:00:00Z'), status: 'PRESENT' } });
    const blocked = await admin.delete(`${API}/${withHistory}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('FACULTY_HAS_HISTORY');

    const clean = (await admin.post(API).send(valid({ email: 'clean@t.test' }))).body.data.id;
    expect((await admin.delete(`${API}/${clean}`)).status).toBe(204);
    expect(await prisma.user.findUnique({ where: { email: 'clean@t.test' } })).toBeNull();
    expect((await admin.delete(`${API}/${clean}`)).status).toBe(404);
  });
});

describe('CSV bulk import (REQ-FAC-04)', () => {
  const header = 'fullName,email,phone,departmentCode,designation,dateOfJoining';

  it('imports valid rows and reports row-level errors', async () => {
    const csv = [
      header,
      'Import One,imp1@t.test,9876500001,CSE,Lecturer,2021-01-10',
      'Import Two,imp2@t.test,9876500002,ECE,Professor,2019-05-20',
      'Bad Row,not-an-email,123,NOPE,Dean,2999-01-01',
      'Import One Again,imp1@t.test,9876500003,CSE,Lecturer,2021-01-10',
      'Taken Email,fac.cse@t.test,9876500004,CSE,Lecturer,2021-01-10',
    ].join('\r\n');
    const res = await admin.post(`${API}/import`).send({ csv });
    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(2);
    expect(res.body.data.failed).toBe(3);
    expect(res.body.data.errors.map((e: { row: number }) => e.row)).toEqual([4, 5, 6]);
    const created = await prisma.faculty.findMany({ where: { user: { email: { in: ['imp1@t.test', 'imp2@t.test'] } } }, include: { user: true } });
    expect(created).toHaveLength(2);
    expect(new Set(created.map((c) => c.employeeId)).size).toBe(2);
    expect(await prisma.user.findUnique({ where: { email: 'not-an-email' } })).toBeNull();
  });

  it('rejects empty files, missing columns, header-only files and oversized files with 400', async () => {
    expect((await admin.post(`${API}/import`).send({ csv: '' })).status).toBe(400);
    expect((await admin.post(`${API}/import`).send({ csv: '\n\n' })).body.error.code).toBe('INVALID_CSV');
    expect((await admin.post(`${API}/import`).send({ csv: 'fullName,email\nA,b' })).body.error.message).toContain('Missing required columns');
    expect((await admin.post(`${API}/import`).send({ csv: header })).body.error.message).toContain('no data rows');
    const rows = Array.from({ length: 501 }, (_, i) => `N ${i},e${i}@t.test,9876500000,CSE,Lecturer,2020-01-01`);
    expect((await admin.post(`${API}/import`).send({ csv: [header, ...rows].join('\n') })).body.error.message).toContain('At most 500');
  });

  it('imports nothing when every row is invalid, and is admin only', async () => {
    const res = await admin.post(`${API}/import`).send({ csv: `${header}\nX,bad,1,NOPE,Dean,2020-01-01` });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ imported: 0, failed: 1 });
    expect((await hod.post(`${API}/import`).send({ csv: header })).status).toBe(403);
  });
});
