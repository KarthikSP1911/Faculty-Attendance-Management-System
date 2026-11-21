import { validatePassword } from '../../src/services/passwordPolicy';

const make = (len: number) => 'Aa1!' + 'x'.repeat(Math.max(0, len - 4));

describe('validatePassword (REQ-AUTH-06)', () => {
  describe('length boundaries', () => {
    it.each([
      [7, false],
      [8, true],
      [9, true],
      [63, true],
      [64, true],
      [65, false],
    ])('length %i -> valid=%s', (len, valid) => {
      expect(validatePassword(make(len)).valid).toBe(valid);
    });

    it('reports min and max messages', () => {
      expect(validatePassword('Aa1!xxx').errors).toContain('Password must be at least 8 characters');
      expect(validatePassword(make(65)).errors).toContain('Password must be at most 64 characters');
    });
  });

  describe('character classes', () => {
    it.each([
      ['no uppercase', 'abcdef1!', 'uppercase'],
      ['no lowercase', 'ABCDEF1!', 'lowercase'],
      ['no digit', 'Abcdefg!', 'digit'],
      ['no special', 'Abcdefg1', 'special'],
    ])('%s is rejected', (_name, pw, word) => {
      const r = validatePassword(pw);
      expect(r.valid).toBe(false);
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0]).toContain(word);
    });

    it('accepts a strong password', () => {
      expect(validatePassword('Valid@1234')).toEqual({ valid: true, errors: [] });
    });

    it('collects several errors at once', () => {
      expect(validatePassword('').errors.length).toBe(5);
    });
  });
});
