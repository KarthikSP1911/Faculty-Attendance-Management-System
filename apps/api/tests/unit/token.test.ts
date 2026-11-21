import {
  RESET_TOKEN_TTL_MINUTES,
  generateToken,
  hashToken,
  isTokenUsable,
  resetTokenExpiry,
} from '../../src/services/token';

const NOW = new Date('2026-03-02T10:00:00Z');

describe('reset token (REQ-AUTH-03)', () => {
  it('expires 30 minutes after creation', () => {
    expect(RESET_TOKEN_TTL_MINUTES).toBe(30);
    expect(resetTokenExpiry(NOW).getTime()).toBe(NOW.getTime() + 30 * 60_000);
  });

  it('is usable one millisecond before expiry', () => {
    const expiresAt = resetTokenExpiry(NOW);
    expect(isTokenUsable({ expiresAt, usedAt: null }, new Date(expiresAt.getTime() - 1))).toBe(true);
  });

  it('is not usable at or after expiry', () => {
    const expiresAt = resetTokenExpiry(NOW);
    expect(isTokenUsable({ expiresAt, usedAt: null }, expiresAt)).toBe(false);
    expect(isTokenUsable({ expiresAt, usedAt: null }, new Date(expiresAt.getTime() + 1))).toBe(false);
  });

  it('is single use', () => {
    expect(isTokenUsable({ expiresAt: resetTokenExpiry(NOW), usedAt: NOW }, NOW)).toBe(false);
  });

  it('generates unique 96-character hex tokens', () => {
    const a = generateToken();
    expect(a).toMatch(/^[0-9a-f]{96}$/);
    expect(generateToken()).not.toBe(a);
  });

  it('hashes deterministically and depends on the secret', () => {
    expect(hashToken('abc', 's1')).toBe(hashToken('abc', 's1'));
    expect(hashToken('abc', 's1')).not.toBe(hashToken('abc', 's2'));
    expect(hashToken('abc', 's1')).not.toBe('abc');
  });
});
