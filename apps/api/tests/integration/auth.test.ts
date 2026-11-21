import request from 'supertest';
import { createApp } from '../../src/app';
import { loadConfig } from '../../src/config';
import { createAuthService } from '../../src/services/authService';
import { clock, freezeClock, resetClock } from '../../src/utils/clock';
import { TEST_PASSWORD, createUser, disconnect, resetDb } from '../helpers/db';

const cfg = loadConfig();
const app = createApp({ config: cfg, authRateLimit: 1000 });
const authService = createAuthService(cfg);
const API = '/api/v1/auth';

const login = (email: string, password = TEST_PASSWORD, agent = request(app)) =>
  agent.post(`${API}/login`).send({ email, password });

beforeAll(resetDb);
afterAll(disconnect);
afterEach(resetClock);

describe('POST /auth/login (REQ-AUTH-01)', () => {
  beforeAll(async () => {
    await createUser({ email: 'login.ok@fams.test', role: 'FACULTY' });
    await createUser({ email: 'inactive@fams.test', isActive: false });
  });

  it('logs in and sets httpOnly cookies', async () => {
    const res = await login('login.ok@fams.test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, error: null, data: { user: { email: 'login.ok@fams.test', role: 'FACULTY' } } });
    const cookies = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(cookies).toContain('fams_access=');
    expect(cookies).toContain('fams_refresh=');
    expect(cookies).toContain('HttpOnly');
  });

  it('normalises email case', async () => {
    expect((await login('LOGIN.OK@fams.test')).status).toBe(200);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await login('login.ok@fams.test', 'Wrong@1234');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('gives the same 401 for an unknown email', async () => {
    const res = await login('nobody@fams.test');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('blocks deactivated accounts with 403', async () => {
    const res = await login('inactive@fams.test');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('returns 400 with field details for invalid input', async () => {
    const res = await request(app).post(`${API}/login`).send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['email', 'password']);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app).post(`${API}/login`).set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('GET /auth/me and logout', () => {
  it('requires authentication (401)', async () => {
    expect((await request(app).get(`${API}/me`)).status).toBe(401);
    expect((await request(app).get(`${API}/me`).set('Authorization', 'Bearer garbage')).status).toBe(401);
  });

  it('returns the profile when logged in, and logout clears the session', async () => {
    await createUser({ email: 'me@fams.test' });
    const agent = request.agent(app);
    await login('me@fams.test', TEST_PASSWORD, agent as unknown as ReturnType<typeof request>);
    const me = await agent.get(`${API}/me`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('me@fams.test');
    expect((await agent.post(`${API}/logout`)).status).toBe(204);
    expect((await agent.post(`${API}/refresh`)).status).toBe(401);
  });

  it('logout without a session is still 204', async () => {
    expect((await request(app).post(`${API}/logout`)).status).toBe(204);
  });
});

describe('lockout (REQ-AUTH-05)', () => {
  it('locks after 5 failures for 15 minutes, then unlocks', async () => {
    await createUser({ email: 'lock@fams.test' });
    freezeClock('2026-03-02T10:00:00Z');
    for (let i = 0; i < 4; i++) expect((await login('lock@fams.test', 'Wrong@1234')).status).toBe(401);
    expect((await login('lock@fams.test', 'Wrong@1234')).status).toBe(401); // 5th failure triggers the lock

    const locked = await login('lock@fams.test'); // correct password is refused while locked
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');

    freezeClock(new Date('2026-03-02T10:14:59Z'));
    expect((await login('lock@fams.test')).status).toBe(429);

    freezeClock(new Date('2026-03-02T10:15:01Z'));
    expect((await login('lock@fams.test')).status).toBe(200);
  });

  it('a successful login resets the failure counter', async () => {
    await createUser({ email: 'reset-count@fams.test' });
    for (let i = 0; i < 4; i++) await login('reset-count@fams.test', 'Wrong@1234');
    expect((await login('reset-count@fams.test')).status).toBe(200);
    for (let i = 0; i < 4; i++) expect((await login('reset-count@fams.test', 'Wrong@1234')).status).toBe(401);
    expect((await login('reset-count@fams.test')).status).toBe(200);
  });
});

describe('refresh token rotation (REQ-AUTH-02)', () => {
  const refreshCookie = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('fams_refresh=')) as string;

  it('rotates, rejects the old token, and revokes all sessions on re-use', async () => {
    await createUser({ email: 'rotate@fams.test' });
    const first = await login('rotate@fams.test');
    const oldCookie = refreshCookie(first);

    const rotated = await request(app).post(`${API}/refresh`).set('Cookie', oldCookie);
    expect(rotated.status).toBe(200);
    const newCookie = refreshCookie(rotated);
    expect(newCookie).not.toBe(oldCookie);

    const reuse = await request(app).post(`${API}/refresh`).set('Cookie', oldCookie);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('TOKEN_REUSED');

    // re-use detection revoked the newer token as well
    expect((await request(app).post(`${API}/refresh`).set('Cookie', newCookie)).status).toBe(401);
  });

  it('rejects a missing or unknown refresh token', async () => {
    expect((await request(app).post(`${API}/refresh`)).status).toBe(401);
    expect((await request(app).post(`${API}/refresh`).set('Cookie', 'fams_refresh=unknown')).body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects an expired refresh token', async () => {
    await createUser({ email: 'expire@fams.test' });
    const res = await login('expire@fams.test');
    freezeClock(new Date(clock.now().getTime() + 8 * 86_400_000));
    const r = await request(app).post(`${API}/refresh`).set('Cookie', refreshCookie(res));
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

describe('forgot / reset password (REQ-AUTH-03)', () => {
  it('forgot-password is generic for known and unknown emails', async () => {
    await createUser({ email: 'forgot@fams.test' });
    const known = await request(app).post(`${API}/forgot-password`).send({ email: 'forgot@fams.test' });
    const unknown = await request(app).post(`${API}/forgot-password`).send({ email: 'ghost@fams.test' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect((await request(app).post(`${API}/forgot-password`).send({ email: 'bad' })).status).toBe(400);
  });

  it('resets with a valid token, which is single use, and the new password works', async () => {
    await createUser({ email: 'reset@fams.test' });
    const token = (await authService.requestPasswordReset('reset@fams.test')) as string;
    const res = await request(app).post(`${API}/reset-password`).send({ token, newPassword: 'Brand@New1' });
    expect(res.status).toBe(200);
    expect((await login('reset@fams.test', 'Brand@New1')).status).toBe(200);
    expect((await login('reset@fams.test')).status).toBe(401);

    const again = await request(app).post(`${API}/reset-password`).send({ token, newPassword: 'Another@123' });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('rejects an expired token (30 minute window)', async () => {
    await createUser({ email: 'late-reset@fams.test' });
    freezeClock('2026-03-02T10:00:00Z');
    const token = (await authService.requestPasswordReset('late-reset@fams.test')) as string;
    freezeClock('2026-03-02T10:30:00Z'); // exactly at expiry
    expect((await request(app).post(`${API}/reset-password`).send({ token, newPassword: 'Brand@New1' })).status).toBe(400);
  });

  it('accepts a token one minute before expiry', async () => {
    await createUser({ email: 'ontime-reset@fams.test' });
    freezeClock('2026-03-02T10:00:00Z');
    const token = (await authService.requestPasswordReset('ontime-reset@fams.test')) as string;
    freezeClock('2026-03-02T10:29:00Z');
    expect((await request(app).post(`${API}/reset-password`).send({ token, newPassword: 'Brand@New1' })).status).toBe(200);
  });

  it('a new request invalidates the previous token', async () => {
    await createUser({ email: 'two@fams.test' });
    const first = (await authService.requestPasswordReset('two@fams.test')) as string;
    await authService.requestPasswordReset('two@fams.test');
    expect((await request(app).post(`${API}/reset-password`).send({ token: first, newPassword: 'Brand@New1' })).status).toBe(400);
  });

  it('rejects weak passwords and unknown tokens', async () => {
    const weak = await request(app).post(`${API}/reset-password`).send({ token: 'x', newPassword: 'weak' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.details[0].field).toBe('newPassword');
    const unknown = await request(app).post(`${API}/reset-password`).send({ token: 'unknown', newPassword: 'Brand@New1' });
    expect(unknown.status).toBe(400);
  });

  it('does not issue tokens for unknown or inactive users', async () => {
    await createUser({ email: 'off@fams.test', isActive: false });
    expect(await authService.requestPasswordReset('ghost2@fams.test')).toBeNull();
    expect(await authService.requestPasswordReset('off@fams.test')).toBeNull();
  });
});

describe('POST /auth/change-password (REQ-AUTH-04)', () => {
  it('requires authentication', async () => {
    const res = await request(app).post(`${API}/change-password`).send({ currentPassword: 'a', newPassword: 'Brand@New1' });
    expect(res.status).toBe(401);
  });

  it('changes the password and keeps the session valid', async () => {
    await createUser({ email: 'change@fams.test' });
    const agent = request.agent(app);
    await agent.post(`${API}/login`).send({ email: 'change@fams.test', password: TEST_PASSWORD });
    const res = await agent.post(`${API}/change-password`).send({ currentPassword: TEST_PASSWORD, newPassword: 'Changed@123' });
    expect(res.status).toBe(200);
    expect((await agent.get(`${API}/me`)).status).toBe(200);
    expect((await login('change@fams.test', 'Changed@123')).status).toBe(200);
    expect((await login('change@fams.test')).status).toBe(401);
  });

  it('rejects a wrong current password (422), same password (422) and weak password (400)', async () => {
    await createUser({ email: 'change2@fams.test' });
    const agent = request.agent(app);
    await agent.post(`${API}/login`).send({ email: 'change2@fams.test', password: TEST_PASSWORD });
    const wrong = await agent.post(`${API}/change-password`).send({ currentPassword: 'Wrong@1234', newPassword: 'Changed@123' });
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    const same = await agent.post(`${API}/change-password`).send({ currentPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD });
    expect(same.status).toBe(422);
    expect(same.body.error.code).toBe('PASSWORD_REUSE');
    const weak = await agent.post(`${API}/change-password`).send({ currentPassword: TEST_PASSWORD, newPassword: 'short' });
    expect(weak.status).toBe(400);
  });
});

describe('platform behaviour (REQ-NFR-01, REQ-NFR-02)', () => {
  it('health check uses the response envelope and a request id', async () => {
    const res = await request(app).get('/api/v1/health').set('x-request-id', 'req-123');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok' }, error: null });
    expect(res.headers['x-request-id']).toBe('req-123');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff'); // helmet
  });

  it('unknown routes return a 404 envelope', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rate limits /auth/* with 429', async () => {
    const limited = createApp({ config: cfg, authRateLimit: 3 });
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await request(limited).post(`${API}/login`).send({ email: 'x@fams.test', password: 'y' })).status);
    expect(statuses).toEqual([401, 401, 401, 429, 429]);
  });

  it('only allows the configured CORS origin', async () => {
    const ok = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const bad = await request(app).get('/api/v1/health').set('Origin', 'http://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});
