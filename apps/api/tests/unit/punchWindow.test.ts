import { checkInWindow, checkOutWindow, isLateDeduction } from '../../src/services/attendanceRules';
import { istMinutes, isoWeekday, istDate, todayIST } from '../../src/utils/dates';
import { msUntilNextRun } from '../../src/jobs/absentJob';
import { DEFAULT_RULES, MONDAY, ist } from '../helpers/time';

describe('check-in window 07:00-12:00 (REQ-ATT-02)', () => {
  it.each([
    ['06:59', false, 'CHECKIN_NOT_OPEN'],
    ['07:00', true, undefined],
    ['09:00', true, undefined],
    ['12:00', true, undefined],
    ['12:00:59', true, undefined],
    ['12:01', false, 'CHECKIN_CLOSED'],
  ])('at %s allowed=%s', (time, allowed, code) => {
    const r = checkInWindow(ist(MONDAY, time), DEFAULT_RULES);
    expect(r.allowed).toBe(allowed);
    if (!r.allowed) expect(r.code).toBe(code);
  });
});

describe('check-out window and ordering (REQ-ATT-02, REQ-ATT-05)', () => {
  const checkIn = ist(MONDAY, '09:00');
  it('requires a check-in first', () => {
    const r = checkOutWindow(ist(MONDAY, '17:00'), null, DEFAULT_RULES);
    expect(r).toMatchObject({ allowed: false, code: 'NOT_CHECKED_IN' });
  });
  it.each([
    ['09:00', false, 'CHECKOUT_BEFORE_CHECKIN'],
    ['09:01', true, undefined],
    ['23:00', true, undefined],
    ['23:01', false, 'CHECKOUT_CLOSED'],
  ])('check-out at %s allowed=%s', (time, allowed, code) => {
    const r = checkOutWindow(ist(MONDAY, time), checkIn, DEFAULT_RULES);
    expect(r.allowed).toBe(allowed);
    if (!r.allowed) expect(r.code).toBe(code);
  });
  it('rejects a check-out before the check-in', () => {
    expect(checkOutWindow(ist(MONDAY, '08:00'), checkIn, DEFAULT_RULES)).toMatchObject({ code: 'CHECKOUT_BEFORE_CHECKIN' });
  });
});

describe('late deduction (REQ-RULE-06)', () => {
  it.each([
    [0, false],
    [1, false],
    [2, true],
    [3, false],
    [4, false],
    [5, true],
  ])('with %i earlier lates this late deduction=%s', (previous, expected) => {
    expect(isLateDeduction(previous, DEFAULT_RULES)).toBe(expected);
  });
  it('is disabled when the limit is 0', () => {
    expect(isLateDeduction(2, { lateLimitPerMonth: 0 })).toBe(false);
  });
});

describe('IST date helpers', () => {
  it('converts UTC instants to the IST calendar day', () => {
    expect(todayIST(new Date('2026-03-01T18:29:59Z'))).toBe('2026-03-01');
    expect(todayIST(new Date('2026-03-01T18:30:00Z'))).toBe('2026-03-02');
    expect(istMinutes(new Date('2026-03-01T18:30:00Z'))).toBe(0);
    expect(istMinutes(ist(MONDAY, '23:59'))).toBe(1439);
    expect(istDate(ist(MONDAY, '00:30')).toISOString()).toBe('2026-03-02T00:00:00.000Z');
  });
  it('maps weekdays with Sunday as 7', () => {
    expect(isoWeekday('2026-03-02')).toBe(1);
    expect(isoWeekday('2026-03-07')).toBe(6);
    expect(isoWeekday('2026-03-08')).toBe(7);
  });
});

describe('nightly schedule', () => {
  it('runs at 23:59 IST the same day, or the next day once past it', () => {
    expect(msUntilNextRun(ist(MONDAY, '23:00'))).toBe(59 * 60_000);
    expect(msUntilNextRun(ist(MONDAY, '23:59'))).toBe(86_400_000);
    expect(msUntilNextRun(ist(MONDAY, '00:00'))).toBe((23 * 60 + 59) * 60_000);
  });
});
