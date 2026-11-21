import { isValidDateString } from '../utils/dates';
import { addDays, diffDays } from './leaveRules';

export const REG_WINDOW_DAYS = 7;
export const REG_MAX_PER_MONTH = 3;
export const REG_REASON_MIN = 10;
export const REG_REASON_MAX = 300;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface RegularizationInput {
  date: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  reason: string;
  today: string;
}

export interface RegularizationIssue {
  field: string;
  code: 'INVALID' | 'LIMIT_REACHED';
  message: string;
}

/**
 * REQ-REG-01, REQ-REG-02. The date may be today or up to 7 days back; the reason is 10-300
 * characters; at most 3 requests may be raised in a calendar month (`requestsThisMonth`).
 */
export function validateRegularization(input: RegularizationInput, requestsThisMonth: number): RegularizationIssue[] {
  const issues: RegularizationIssue[] = [];
  const bad = (field: string, message: string) => issues.push({ field, code: 'INVALID', message });

  if (!isValidDateString(input.date)) bad('date', 'Date must be a valid YYYY-MM-DD date');
  else if (input.date > input.today) bad('date', 'Date cannot be in the future');
  else if (diffDays(input.date, input.today) > REG_WINDOW_DAYS) {
    bad('date', `Regularization is allowed only for the last ${REG_WINDOW_DAYS} days`);
  }

  const reason = input.reason.trim();
  if (reason.length < REG_REASON_MIN || reason.length > REG_REASON_MAX) {
    bad('reason', `Reason must be ${REG_REASON_MIN}-${REG_REASON_MAX} characters`);
  }

  const { requestedCheckIn: inT, requestedCheckOut: outT } = input;
  if (!inT && !outT) bad('requestedCheckIn', 'Provide a check-in time, a check-out time, or both');
  if (inT && !HHMM.test(inT)) bad('requestedCheckIn', 'Check-in time must be HH:mm');
  if (outT && !HHMM.test(outT)) bad('requestedCheckOut', 'Check-out time must be HH:mm');
  if (inT && outT && HHMM.test(inT) && HHMM.test(outT) && outT <= inT) {
    bad('requestedCheckOut', 'Check-out must be after check-in');
  }

  if (issues.length === 0 && requestsThisMonth >= REG_MAX_PER_MONTH) {
    issues.push({
      field: 'date',
      code: 'LIMIT_REACHED',
      message: `You can raise at most ${REG_MAX_PER_MONTH} regularization requests per month`,
    });
  }
  return issues;
}

export const earliestRegularizableDate = (today: string): string => addDays(today, -REG_WINDOW_DAYS);
