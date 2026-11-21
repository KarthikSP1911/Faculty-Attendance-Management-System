import type { AttendanceStatus } from '@prisma/client';
import { istMinutes } from '../utils/dates';
import { toMinutes } from './shiftRules';

export interface RuleSet {
  graceMinutes: number;
  lateCutoffTime: string;
  checkInOpenTime: string;
  checkInCloseTime: string;
  checkOutCloseTime: string;
  presentMinMinutes: number;
  halfDayMinMinutes: number;
  lateLimitPerMonth: number;
}

export type DayType = 'WORKING' | 'HOLIDAY' | 'WEEKLY_OFF';
export type LeaveKind = 'FULL' | 'HALF' | null;
export type Arrival = 'ON_TIME' | 'LATE' | 'HALF_DAY';

export interface DailyStatusInput {
  dayType: DayType;
  leave?: LeaveKind;
  checkInAt?: Date | null;
  checkOutAt?: Date | null;
  /** True once no further punches are possible (past the check-out window, or a past date). */
  dayClosed?: boolean;
  shiftStart: string;
  rules: RuleSet;
}

export interface DailyStatusResult {
  status: AttendanceStatus;
  workedMinutes: number | null;
  arrival: Arrival | null;
}

/** REQ-RULE-02: on time up to start + grace, Late up to the cut-off, Half Day after it. */
export function classifyArrival(checkInAt: Date, shiftStart: string, rules: RuleSet): Arrival {
  const minute = istMinutes(checkInAt);
  if (minute <= toMinutes(shiftStart) + rules.graceMinutes) return 'ON_TIME';
  if (minute <= toMinutes(rules.lateCutoffTime)) return 'LATE';
  return 'HALF_DAY';
}

/** REQ-RULE-03: 7 h or more Present, 4 h up to 7 h Half Day, under 4 h Absent. */
export function classifyHours(workedMinutes: number, rules: RuleSet): 'PRESENT' | 'HALF_DAY' | 'ABSENT' {
  if (workedMinutes >= rules.presentMinMinutes) return 'PRESENT';
  if (workedMinutes >= rules.halfDayMinMinutes) return 'HALF_DAY';
  return 'ABSENT';
}

export const workedMinutesBetween = (checkIn: Date, checkOut: Date): number =>
  Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 60_000));

/**
 * REQ-RULE-02..05. Order of precedence: holiday, weekly off, approved full-day leave, then punches.
 * With a check-in but no check-out: Pending while the day is open, Half Day once it is closed
 * (a missed check-out; the faculty member can regularize it).
 */
export function computeDailyStatus(input: DailyStatusInput): DailyStatusResult {
  const { dayType, leave, checkInAt, checkOutAt, dayClosed, shiftStart, rules } = input;
  const none = { workedMinutes: null, arrival: null };

  if (dayType === 'HOLIDAY') return { status: 'HOLIDAY', ...none };
  if (dayType === 'WEEKLY_OFF') return { status: 'WEEKLY_OFF', ...none };
  if (leave === 'FULL') return { status: 'ON_LEAVE', ...none };

  if (!checkInAt) {
    // A half-day leave with no punches still counts as half a day worked.
    return { status: leave === 'HALF' ? 'HALF_DAY' : 'ABSENT', ...none };
  }

  const arrival = classifyArrival(checkInAt, shiftStart, rules);
  if (!checkOutAt) {
    return { status: dayClosed ? 'HALF_DAY' : 'PENDING', workedMinutes: null, arrival };
  }

  const workedMinutes = workedMinutesBetween(checkInAt, checkOutAt);
  const hours = classifyHours(workedMinutes, rules);
  let status: AttendanceStatus;
  if (hours === 'ABSENT') status = 'ABSENT';
  else if (hours === 'HALF_DAY' || arrival === 'HALF_DAY') status = 'HALF_DAY';
  else if (arrival === 'LATE') status = 'LATE';
  else status = 'PRESENT';
  return { status, workedMinutes, arrival };
}

export type PunchCheck = { allowed: true } | { allowed: false; code: string; message: string };

/** REQ-ATT-02: check-in is accepted from the open time to the close time, both inclusive. */
export function checkInWindow(now: Date, rules: RuleSet): PunchCheck {
  const minute = istMinutes(now);
  if (minute < toMinutes(rules.checkInOpenTime)) {
    return { allowed: false, code: 'CHECKIN_NOT_OPEN', message: `Check-in opens at ${rules.checkInOpenTime}` };
  }
  if (minute > toMinutes(rules.checkInCloseTime)) {
    return {
      allowed: false,
      code: 'CHECKIN_CLOSED',
      message: `Check-in closed at ${rules.checkInCloseTime}. Please submit a regularization request.`,
    };
  }
  return { allowed: true };
}

/** REQ-ATT-02 and REQ-ATT-05: check-out until the close time, and strictly after the check-in. */
export function checkOutWindow(now: Date, checkInAt: Date | null | undefined, rules: RuleSet): PunchCheck {
  if (!checkInAt) return { allowed: false, code: 'NOT_CHECKED_IN', message: 'You have not checked in today' };
  if (istMinutes(now) > toMinutes(rules.checkOutCloseTime)) {
    return { allowed: false, code: 'CHECKOUT_CLOSED', message: `Check-out closed at ${rules.checkOutCloseTime}` };
  }
  if (now.getTime() <= checkInAt.getTime()) {
    return { allowed: false, code: 'CHECKOUT_BEFORE_CHECKIN', message: 'Check-out must be after check-in' };
  }
  return { allowed: true };
}

/**
 * REQ-RULE-06: every third Late in a calendar month counts as one Half Day deduction.
 * `previousLates` is the number of earlier Late days in the same month.
 */
export const isLateDeduction = (previousLates: number, rules: Pick<RuleSet, 'lateLimitPerMonth'>): boolean =>
  rules.lateLimitPerMonth > 0 && (previousLates + 1) % rules.lateLimitPerMonth === 0;
