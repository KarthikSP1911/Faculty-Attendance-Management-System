import { test, expect, asRole, futureWeekday, istHour } from '../fixtures';
import { ACCOUNTS } from '../fixtures/accounts';
import { ApprovalsPage, DepartmentsPage, LeavePage, LoginPage, RegularizationPage } from '../pages/pages';

const stamp = () => Date.now().toString(36).toUpperCase();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const uiDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const letters = (n: number) => Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');

// Admin and hod UI logins are exercised by auth.setup.ts, which asserts the role dashboard URL.
test('J1 faculty logs in, lands on own dashboard and logs out', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(ACCOUNTS.faculty.email, ACCOUNTS.faculty.password);
  await expect(page).toHaveURL(/\/faculty\/dashboard/);
  const more = page.getByTestId('nav-more');
  if (await more.isVisible()) await more.click(); // mobile: logout lives in the More sheet
  await page.getByTestId('logout-button').click();
  await expect(page).toHaveURL(/\/login|\/$/);
});

test('J2 invalid credentials show an error and stay on login', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login('admin@fams.test', 'wrong-password-1');
  await expect(login.error()).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('J3 faculty check-in and check-out (07:00-12:00 IST window)', async ({ browser, baseURL }) => {
  const hour = istHour();
  const page = await asRole(browser, 'faculty', baseURL);
  await page.goto('/faculty/dashboard');
  await expect(page.getByTestId('checkin-card')).toBeVisible();
  if (await page.getByTestId('checkin-blocked').isVisible()) {
    test.info().annotations.push({ type: 'day', description: 'holiday / weekly off / on leave: check-in blocked in UI' });
    await expect(page.getByTestId('checkin-button')).toBeDisabled();
    return;
  }
  const button = page.getByTestId('checkin-button');
  if (hour < 7 || hour >= 12) {
    test.info().annotations.push({ type: 'window', description: `IST hour ${hour}: outside window, asserting server rejection` });
    if (await button.isEnabled()) {
      await button.click();
      await expect(page.getByTestId('checkin-error')).toBeVisible();
    }
    return;
  }
  if (await button.isEnabled()) await button.click();
  await expect(page.getByTestId('checkin-time')).toBeVisible();
});

test('J4 leave: faculty applies, HOD approves', async ({ browser, baseURL }) => {
  const reason = `E2E leave ${stamp()}`;
  const fac = await asRole(browser, 'faculty', baseURL);
  const leave = new LeavePage(fac);
  await leave.goto();
  const date = futureWeekday();
  await leave.apply(date, reason);
  await expect(leave.row(uiDate(date)).first()).toBeVisible();

  const hod = await asRole(browser, 'hod', baseURL);
  const approvals = new ApprovalsPage(hod);
  await approvals.goto();
  await approvals.approve('leave', reason);
  await expect(hod.getByTestId('approvals-table-leave').locator('tr').filter({ hasText: reason })).toHaveCount(0);

  await leave.goto();
  await expect(leave.row(uiDate(date)).first()).toContainText(/approved/i);
});

test('J5 regularization: faculty requests, HOD approves', async ({ browser, baseURL }) => {
  const reason = `E2E regularization ${stamp()}`;
  // Regularization is capped at 3 requests per faculty per month, so rotate through the seeded CSE faculty.
  const fac = await (await browser.newContext({ baseURL })).newPage();
  const login = new LoginPage(fac);
  await login.goto();
  await login.login(`cse.faculty${2 + Math.floor(Math.random() * 9)}@fams.test`, ACCOUNTS.faculty.password);
  await expect(fac).toHaveURL(/\/faculty\/dashboard/);
  await fac.waitForLoadState('networkidle');
  const reg = new RegularizationPage(fac);
  await reg.goto();
  // must be within the last 7 days; pick a recent weekday that is not today
  const d = new Date(Date.now() - 86400000);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() - 1);
  await reg.submit(d.toISOString().slice(0, 10), '09:05', '16:30', reason);
  await expect(fac.getByTestId('regularization-error')).toHaveCount(0);
  await expect(fac.getByTestId('reg-reason')).toHaveValue('');

  const hod = await asRole(browser, 'hod', baseURL);
  const approvals = new ApprovalsPage(hod);
  await approvals.goto();
  await approvals.approve('regularization', reason);
  await expect(hod.getByTestId('approvals-table-regularization').locator('tr').filter({ hasText: reason })).toHaveCount(0);
});

test('J6 admin creates and deletes a department', async ({ browser, baseURL }) => {
  const code = letters(6);
  const page = await asRole(browser, 'admin', baseURL);
  const depts = new DepartmentsPage(page);
  await depts.goto();
  await depts.create(`E2E Dept ${code}`, code);
  await expect(depts.row(code)).toBeVisible();
  await depts.remove(code);
  await expect(depts.row(code)).toHaveCount(0);
});

test('J7 admin reports table and CSV export', async ({ browser, baseURL }) => {
  const page = await asRole(browser, 'admin', baseURL);
  await page.goto('/admin/reports');
  await expect(page.getByTestId('report-filters')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByTestId('report-export-csv').click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
});

test('J8 role guard: faculty cannot open admin pages', async ({ browser, baseURL }) => {
  const page = await asRole(browser, 'faculty', baseURL);
  await page.goto('/admin/dashboard');
  await expect(page).not.toHaveURL(/\/admin\/dashboard/);
});

test('J9 navigation: back control and notifications bell', async ({ browser, baseURL }) => {
  const page = await asRole(browser, 'faculty', baseURL);
  await page.goto('/faculty/dashboard');
  await page.getByTestId('bell-link').click();
  await expect(page).toHaveURL(/\/faculty\/notifications/);
  await page.getByTestId('back-button').click();
  await expect(page).toHaveURL(/\/faculty\/dashboard/);
});
