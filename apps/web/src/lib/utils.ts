import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AttendanceStatus, Role } from './types';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const TZ = 'Asia/Kolkata';

export const todayKey = (): string => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
export const monthKey = (d = todayKey()): string => d.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** ISO weekday (1 = Monday) of the first of the month. */
export function firstWeekday(month: string): number {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  return d === 0 ? 7 : d;
}

export const fmtDate = (s: string): string =>
  new Date(`${s.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const fmtTime = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ }) : '--';

export const fmtDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ });

export const fmtMinutes = (m: number | null | undefined): string => (m == null ? '--' : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`);

export const num = (v: string | number): number => Number(v);

export const ROLE_HOME: Record<Role, string> = {
  FACULTY: '/faculty/dashboard',
  HOD: '/hod/dashboard',
  ADMIN: '/admin/dashboard',
};

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PENDING: 'In progress',
  PRESENT: 'Present',
  LATE: 'Late',
  HALF_DAY: 'Half day',
  ABSENT: 'Absent',
  ON_LEAVE: 'On leave',
  HOLIDAY: 'Holiday',
  WEEKLY_OFF: 'Weekly off',
};

/** Tailwind classes per status; always paired with a text label so colour is never the only signal. */
export const STATUS_CLASS: Record<AttendanceStatus, string> = {
  PENDING: 'bg-primary/10 text-primary',
  PRESENT: 'bg-st-present/15 text-st-present',
  LATE: 'bg-st-late/15 text-st-late',
  HALF_DAY: 'bg-st-half/15 text-st-half',
  ABSENT: 'bg-st-absent/15 text-st-absent',
  ON_LEAVE: 'bg-st-leave/15 text-st-leave',
  HOLIDAY: 'bg-st-holiday/15 text-st-holiday',
  WEEKLY_OFF: 'bg-st-off/15 text-st-off',
};

export const STATUS_HEX: Record<string, string> = {
  present: '#15803d',
  late: '#b46400',
  halfDay: '#c2410c',
  absent: '#c81e1e',
  onLeave: '#0071e3',
};

export const humanize = (s: string): string => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
