const IST_OFFSET_MS = 330 * 60_000; // Asia/Kolkata, no DST

/** Today's calendar date (YYYY-MM-DD) in Asia/Kolkata for the given instant. */
export function todayIST(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes since midnight in Asia/Kolkata (seconds are dropped, so 09:15:59 is minute 555). */
export function istMinutes(at: Date): number {
  const shifted = new Date(at.getTime() + IST_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** ISO weekday of a YYYY-MM-DD date: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** The IST calendar date (YYYY-MM-DD) of an instant, as a Date at 00:00 UTC (matches @db.Date columns). */
export const istDate = (at: Date): Date => toDateOnly(todayIST(at));

/** YYYY-MM of a YYYY-MM-DD string. */
export const monthOf = (dateStr: string): string => dateStr.slice(0, 7);

/** True only for real calendar dates written as YYYY-MM-DD (rejects 2026-02-30). */
export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export const toDateOnly = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
export const formatDateOnly = (d: Date): string => d.toISOString().slice(0, 10);
