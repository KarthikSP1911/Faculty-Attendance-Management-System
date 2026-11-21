import type { HalfDay, LeaveStatus } from '@prisma/client';
import { isoWeekday, isValidDateString } from '../utils/dates';

export const MAX_LEAVE_DAYS = 15;
/** How far back a leave may start (sick leave is often applied for afterwards). */
export const BACKDATE_LIMIT_DAYS = 30;
/** How far ahead a leave may start. */
export const ADVANCE_LIMIT_DAYS = 365;
export const REASON_MIN = 10;
export const REASON_MAX = 300;

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Days from `a` to `b` (b - a) for YYYY-MM-DD strings. */
export const diffDays = (a: string, b: string): number =>
  Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);

/** Working days in [start, end]: weekly offs and holidays are not counted. */
export function countWorkingDays(start: string, end: string, workingDays: number[], holidays: ReadonlySet<string>): number {
  let count = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (workingDays.includes(isoWeekday(d)) && !holidays.has(d)) count++;
  }
  return count;
}

export interface LeaveInput {
  startDate: string;
  endDate: string;
  halfDay: HalfDay;
  reason: string;
  today: string;
}

export interface LeaveContext {
  workingDays: number[];
  holidays: ReadonlySet<string>;
  /** Days still available for this leave type; null means unlimited (On Duty). */
  balanceRemaining: number | null;
  /** True when an active (Pending or Approved) request already covers any of these dates. */
  overlaps: boolean;
  requiresReason?: boolean;
}

export interface LeaveIssue {
  field: string;
  code: 'INVALID' | 'OVERLAP' | 'INSUFFICIENT_BALANCE';
  message: string;
}

/** REQ-LEAVE-02, REQ-LEAVE-03. Returns the number of leave days and every problem found. */
export function validateLeaveRequest(input: LeaveInput, ctx: LeaveContext): { days: number; issues: LeaveIssue[] } {
  const issues: LeaveIssue[] = [];
  const bad = (field: string, message: string) => issues.push({ field, code: 'INVALID', message });

  const startOk = isValidDateString(input.startDate);
  const endOk = isValidDateString(input.endDate);
  if (!startOk) bad('startDate', 'Start date must be a valid YYYY-MM-DD date');
  if (!endOk) bad('endDate', 'End date must be a valid YYYY-MM-DD date');

  const reason = input.reason.trim();
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
    bad('reason', `Reason must be ${REASON_MIN}-${REASON_MAX} characters`);
  }

  if (!startOk || !endOk) return { days: 0, issues };
  if (input.endDate < input.startDate) {
    bad('endDate', 'End date cannot be before the start date');
    return { days: 0, issues };
  }
  if (input.startDate < addDays(input.today, -BACKDATE_LIMIT_DAYS)) {
    bad('startDate', `Leave cannot start more than ${BACKDATE_LIMIT_DAYS} days in the past`);
  }
  if (input.startDate > addDays(input.today, ADVANCE_LIMIT_DAYS)) {
    bad('startDate', `Leave cannot start more than ${ADVANCE_LIMIT_DAYS} days ahead`);
  }
  if (input.startDate.slice(0, 4) !== input.endDate.slice(0, 4)) {
    bad('endDate', 'A leave request cannot span two calendar years; split it into two requests');
  }

  const working = countWorkingDays(input.startDate, input.endDate, ctx.workingDays, ctx.holidays);
  let days = working;
  if (input.halfDay !== 'NONE') {
    if (input.startDate !== input.endDate) bad('halfDay', 'A half-day leave must be a single day');
    else if (working === 0) bad('startDate', 'The selected day is not a working day');
    else days = 0.5;
  } else if (working === 0) {
    bad('startDate', 'The selected dates contain no working days');
  } else if (working > MAX_LEAVE_DAYS) {
    bad('endDate', `A leave request can cover at most ${MAX_LEAVE_DAYS} working days`);
  }

  if (issues.length > 0) return { days, issues };
  if (ctx.overlaps) {
    issues.push({ field: 'startDate', code: 'OVERLAP', message: 'You already have a leave request covering these dates' });
  } else if (ctx.balanceRemaining !== null && days > ctx.balanceRemaining) {
    issues.push({
      field: 'leaveTypeId',
      code: 'INSUFFICIENT_BALANCE',
      message: `Insufficient balance: ${ctx.balanceRemaining} day(s) left, ${days} requested`,
    });
  }
  return { days, issues };
}

const TRANSITIONS: Record<LeaveStatus, LeaveStatus[]> = {
  DRAFT: ['PENDING'],
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
};

export type TransitionCheck = { allowed: true } | { allowed: false; message: string };

/** REQ-LEAVE-04. Approved leave can be cancelled only while it has not started. */
export function canTransitionLeave(
  from: LeaveStatus,
  to: LeaveStatus,
  ctx: { startDate: string; today: string },
): TransitionCheck {
  if (!TRANSITIONS[from].includes(to)) {
    return { allowed: false, message: `A ${from.toLowerCase()} leave request cannot become ${to.toLowerCase()}` };
  }
  if (from === 'APPROVED' && to === 'CANCELLED' && ctx.startDate <= ctx.today) {
    return { allowed: false, message: 'Approved leave can be cancelled only before it starts' };
  }
  return { allowed: true };
}
