import { loadConfig } from '../../src/config';
import { clock, freezeClock, resetClock, setClock } from '../../src/utils/clock';

describe('clock', () => {
  afterEach(resetClock);

  it('freezes time', () => {
    freezeClock('2026-03-02T09:15:00Z');
    expect(clock.now().toISOString()).toBe('2026-03-02T09:15:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-03-02T09:15:00.000Z');
  });

  it('accepts a custom clock and can be reset to system time', () => {
    setClock({ now: () => new Date('2000-01-01T00:00:00Z') });
    expect(clock.now().getUTCFullYear()).toBe(2000);
    resetClock();
    expect(clock.now().getUTCFullYear()).toBeGreaterThan(2020);
  });
});

describe('loadConfig', () => {
  const full = {
    DATABASE_URL: 'x',
    DIRECT_URL: 'x',
    JWT_ACCESS_SECRET: 'a',
    JWT_REFRESH_SECRET: 'b',
    CLIENT_URL: 'http://localhost:3000',
  };

  it('fails fast and names the missing variables', () => {
    expect(() => loadConfig({ ...full, DATABASE_URL: '', JWT_ACCESS_SECRET: undefined })).toThrow(
      /DATABASE_URL, JWT_ACCESS_SECRET/,
    );
  });

  it('returns a typed config with defaults', () => {
    const cfg = loadConfig(full);
    expect(cfg.port).toBe(4000);
    expect(cfg.nodeEnv).toBe('development');
    expect(loadConfig({ ...full, PORT: '5000', NODE_ENV: 'production' })).toMatchObject({ port: 5000, nodeEnv: 'production' });
  });
});
