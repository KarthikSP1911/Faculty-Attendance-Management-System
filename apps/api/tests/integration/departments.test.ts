import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db';
import { disconnect, resetDb } from '../helpers/db';
import { agentFor, createFaculty, seedBase, type Agent } from '../helpers/fixtures';

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

describe('departments (REQ-DEPT-01..03)', () => {
  it('requires authentication (401) and lets any role read', async () => {
    expect((await request(app).get('/api/v1/departments')).status).toBe(401);
    for (const a of [admin, hod, fac]) {
      const res = await a.get('/api/v1/departments');
      expect(res.status).toBe(200);
      expect(res.body.data.map((d: { code: string }) => d.code)).toEqual(['CSE', 'ECE']);
    }
    const one = await fac.get(`/api/v1/departments/${w.cse.id}`);
    expect(one.body.data).toMatchObject({ code: 'CSE', activeFacultyCount: 2, hod: { employeeId: expect.any(String) } });
    expect((await fac.get('/api/v1/departments/nope')).status).toBe(404);
  });

  it('only admin can create (403 for HOD and faculty)', async () => {
    for (const a of [hod, fac]) expect((await a.post('/api/v1/departments').send({ name: 'Maths', code: 'MATH' })).status).toBe(403);
  });

  it('creates, updates and audits a department', async () => {
    const created = await admin.post('/api/v1/departments').send({ name: 'Mechanical', code: 'MECH' });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const updated = await admin.put(`/api/v1/departments/${id}`).send({ name: 'Mechanical Engineering', code: 'MECH' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Mechanical Engineering');

    const logs = await prisma.auditLog.findMany({ where: { entity: 'Department', entityId: id }, orderBy: { createdAt: 'asc' } });
    expect(logs.map((l) => l.action)).toEqual(['CREATE', 'UPDATE']);
    expect(logs[1].oldValue).toMatchObject({ name: 'Mechanical' });
    expect(logs[1].newValue).toMatchObject({ name: 'Mechanical Engineering' });
    expect(logs[1].actorId).toBe(w.admin.id);
  });

  it.each([
    [{ name: 'A', code: 'AB' }, 'name'],
    [{ name: 'Valid', code: 'cse' }, 'code'],
    [{ name: 'Valid', code: 'TOOLONGCODE' }, 'code'],
    [{}, 'name'],
  ])('rejects invalid input %j with field details (400)', async (body, field) => {
    const res = await admin.post('/api/v1/departments').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it('rejects a duplicate code with 409 on create and update', async () => {
    expect((await admin.post('/api/v1/departments').send({ name: 'Another', code: 'CSE' })).status).toBe(409);
    expect((await admin.put(`/api/v1/departments/${w.ece.id}`).send({ name: 'Electronics', code: 'CSE' })).status).toBe(409);
  });

  it('returns 404 when updating or deleting an unknown department', async () => {
    expect((await admin.put('/api/v1/departments/nope').send({ name: 'Valid', code: 'VAL' })).status).toBe(404);
    expect((await admin.delete('/api/v1/departments/nope')).status).toBe(404);
  });

  it('cannot delete a department with active faculty (409), but can delete an empty one', async () => {
    const blocked = await admin.delete(`/api/v1/departments/${w.cse.id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('DEPARTMENT_HAS_ACTIVE_FACULTY');

    const empty = await admin.post('/api/v1/departments').send({ name: 'Empty Dept', code: 'EMPTY' });
    expect((await admin.delete(`/api/v1/departments/${empty.body.data.id}`)).status).toBe(204);
    expect((await admin.get(`/api/v1/departments/${empty.body.data.id}`)).status).toBe(404);
    expect(await prisma.auditLog.count({ where: { entity: 'Department', action: 'DELETE' } })).toBe(1);
  });

  it('blocks deletion when only inactive faculty (history) remain', async () => {
    const d = await prisma.department.create({ data: { name: 'History Dept', code: 'HIST' } });
    await createFaculty({ email: 'old@t.test', departmentId: d.id, shiftId: w.shift.id, status: 'INACTIVE' });
    const res = await admin.delete(`/api/v1/departments/${d.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DEPARTMENT_HAS_HISTORY');
  });
});

describe('HOD assignment (REQ-DEPT-02)', () => {
  it('assigns one HOD per department and swaps roles', async () => {
    const d = await prisma.department.create({ data: { name: 'Physics', code: 'PHY' } });
    const a = await createFaculty({ email: 'phy.a@t.test', departmentId: d.id, shiftId: w.shift.id });
    const b = await createFaculty({ email: 'phy.b@t.test', departmentId: d.id, shiftId: w.shift.id });

    expect((await admin.put(`/api/v1/departments/${d.id}/hod`).send({ facultyId: a.faculty.id })).body.data.hod.id).toBe(a.faculty.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).role).toBe('HOD');

    await admin.put(`/api/v1/departments/${d.id}/hod`).send({ facultyId: b.faculty.id });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).role).toBe('FACULTY');
    expect((await prisma.user.findUniqueOrThrow({ where: { id: b.user.id } })).role).toBe('HOD');

    const cleared = await admin.put(`/api/v1/departments/${d.id}/hod`).send({ facultyId: null });
    expect(cleared.body.data.hod).toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: b.user.id } })).role).toBe('FACULTY');
  });

  it('rejects a faculty from another department, an inactive one and an unknown one', async () => {
    expect((await admin.put(`/api/v1/departments/${w.cse.id}/hod`).send({ facultyId: w.facEce.faculty.id })).status).toBe(409);
    const d = await prisma.department.create({ data: { name: 'Chem', code: 'CHEM' } });
    const off = await createFaculty({ email: 'chem.off@t.test', departmentId: d.id, shiftId: w.shift.id, status: 'INACTIVE' });
    expect((await admin.put(`/api/v1/departments/${d.id}/hod`).send({ facultyId: off.faculty.id })).status).toBe(409);
    expect((await admin.put(`/api/v1/departments/${d.id}/hod`).send({ facultyId: 'nope' })).status).toBe(404);
    expect((await admin.put(`/api/v1/departments/${d.id}/hod`).send({})).status).toBe(400);
  });

  it('a faculty member cannot be HOD of two departments (409)', async () => {
    // hodCse is already HOD of CSE; ECE assignment fails on department membership first
    const res = await admin.put(`/api/v1/departments/${w.ece.id}/hod`).send({ facultyId: w.hodCse.faculty.id });
    expect(res.status).toBe(409);
  });

  it('is admin only (403)', async () => {
    expect((await hod.put(`/api/v1/departments/${w.cse.id}/hod`).send({ facultyId: null })).status).toBe(403);
  });
});
