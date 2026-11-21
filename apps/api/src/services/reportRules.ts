import type { AttendanceStatus } from '@prisma/client';

export interface Counts {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  /** Late days that carry the third-late Half Day deduction. */
  lateDeductions: number;
}

export const emptyCounts = (): Counts => ({ present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0, lateDeductions: 0 });

/**
 * REQ-RPT-04: (Present + 0.5 x Half Day + On Leave) / Working Days x 100, rounded to 2 decimals.
 * A Late day counts as Present; each late-deduction takes 0.5 day off. The result is kept within 0-100.
 */
export function calculateAttendancePercentage(counts: Counts, workingDays: number): number {
  if (workingDays <= 0) return 0;
  const credit = counts.present + counts.late + 0.5 * counts.halfDay + counts.onLeave - 0.5 * counts.lateDeductions;
  const pct = (credit / workingDays) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)) * 100) / 100;
}

/** Muster-roll codes (REQ-RPT-02). */
export const MUSTER_CODES: Record<AttendanceStatus, string> = {
  PENDING: 'P',
  PRESENT: 'P',
  LATE: 'L',
  HALF_DAY: 'HD',
  ABSENT: 'A',
  ON_LEAVE: 'OL',
  HOLIDAY: 'H',
  WEEKLY_OFF: 'WO',
};
export const musterCode = (status: AttendanceStatus): string => MUSTER_CODES[status];

/** Spreadsheet programs run cells that start with = + - @ as formulas; prefix them with a quote. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export const DEFAULTER_THRESHOLD = 75;
