import { test as base, type Browser, type Page } from '@playwright/test';
import { authFile, type Role } from './accounts';

export { expect } from '@playwright/test';
export const test = base;

/** Opens a fresh page authenticated as the given role (storageState from auth.setup). */
export async function asRole(browser: Browser, role: Role, baseURL: string | undefined): Promise<Page> {
  const ctx = await browser.newContext({ storageState: authFile(role), baseURL });
  return ctx.newPage();
}

/** A weekday well in the future, randomised so reruns do not collide. */
export function futureWeekday(minDays = 60): string {
  const d = new Date(Date.now() + (minDays + Math.floor(Math.random() * 200)) * 86400000);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Current IST hour (check-in window is 07:00-12:00 IST). */
export function istHour(): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
}
