import type { RuleSet } from '../../src/services/attendanceRules';

/** Builds an instant from an Asia/Kolkata wall-clock date and time, e.g. ist('2026-03-02', '09:15:30'). */
export function ist(date: string, time: string): Date {
  const [h, m, s = '0'] = time.split(':');
  const hh = h.padStart(2, '0');
  const mm = m.padStart(2, '0');
  const ss = s.padStart(2, '0');
  return new Date(new Date(`${date}T${hh}:${mm}:${ss}.000Z`).getTime() - 330 * 60_000);
}

export const DEFAULT_RULES: RuleSet = {
  graceMinutes: 15,
  lateCutoffTime: '10:30',
  checkInOpenTime: '07:00',
  checkInCloseTime: '12:00',
  checkOutCloseTime: '23:00',
  presentMinMinutes: 420,
  halfDayMinMinutes: 240,
  lateLimitPerMonth: 3,
};

/** 2026-03-02 is a Monday. */
export const MONDAY = '2026-03-02';
