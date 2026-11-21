export const GRACE_MIN = 0;
export const GRACE_MAX = 60;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidGrace = (n: number): boolean => Number.isInteger(n) && n >= GRACE_MIN && n <= GRACE_MAX;

export const isValidTime = (s: string): boolean => HHMM.test(s);

export const toMinutes = (s: string): number => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

/** Returns an error message, or null when the shift is valid. */
export function validateShift(shift: { startTime: string; endTime: string; workingDays: number[] }): string | null {
  if (!isValidTime(shift.startTime) || !isValidTime(shift.endTime)) return 'Times must be HH:mm (24-hour)';
  if (toMinutes(shift.endTime) <= toMinutes(shift.startTime)) return 'End time must be after start time';
  if (shift.workingDays.length === 0) return 'At least one working day is required';
  if (shift.workingDays.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) {
    return 'Working days must be 1 (Monday) to 6 (Saturday); Sunday is always a weekly off';
  }
  if (new Set(shift.workingDays).size !== shift.workingDays.length) return 'Working days must be unique';
  return null;
}
