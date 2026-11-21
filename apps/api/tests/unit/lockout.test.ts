import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS, isLocked, registerFailure } from '../../src/services/lockout';

const NOW = new Date('2026-03-02T10:00:00Z');

describe('lockout (REQ-AUTH-05)', () => {
  it('uses 5 attempts and 15 minutes', () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(LOCK_MINUTES).toBe(15);
  });

  it.each([
    [0, 1, false],
    [3, 4, false],
    [4, 5, true],
    [5, 6, true],
  ])('previous failures %i -> %i attempts, locked=%s', (prev, attempts, locked) => {
    const r = registerFailure({ failedLoginAttempts: prev, lockedUntil: null }, NOW);
    expect(r.failedLoginAttempts).toBe(attempts);
    expect(r.lockedUntil !== null).toBe(locked);
  });

  it('locks for exactly 15 minutes', () => {
    const r = registerFailure({ failedLoginAttempts: 4, lockedUntil: null }, NOW);
    expect(r.lockedUntil?.getTime()).toBe(NOW.getTime() + 15 * 60_000);
  });

  it('restarts the counter after a lock has expired', () => {
    const expired = new Date(NOW.getTime() - 1);
    const r = registerFailure({ failedLoginAttempts: 5, lockedUntil: expired }, NOW);
    expect(r).toEqual({ failedLoginAttempts: 1, lockedUntil: null });
  });

  it('does not reset the counter while still locked', () => {
    const active = new Date(NOW.getTime() + 60_000);
    expect(registerFailure({ failedLoginAttempts: 5, lockedUntil: active }, NOW).failedLoginAttempts).toBe(6);
  });

  describe('isLocked', () => {
    it('is false when never locked', () => expect(isLocked({ lockedUntil: null }, NOW)).toBe(false));
    it('is true before expiry', () => expect(isLocked({ lockedUntil: new Date(NOW.getTime() + 1) }, NOW)).toBe(true));
    it('is false at the exact expiry instant', () => expect(isLocked({ lockedUntil: NOW }, NOW)).toBe(false));
  });
});
