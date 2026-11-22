import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect, asRole, futureWeekday } from '../fixtures';
import type { Role } from '../fixtures/accounts';
import { ACCOUNTS, authFile } from '../fixtures/accounts';
import { ApprovalsPage, LeavePage } from '../pages/pages';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const uiDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const ROLES: Role[] = ['faculty', 'hod', 'admin'];
const dash = (role: Role) => `/${role}/dashboard`;
const API = 'http://localhost:4000/api/v1';

interface Balance {
  leaveType: { code: string; name: string };
  allotted: string | number;
  used: string | number;
}

// ---------- TC-LEAVE-042 ----------
test('TC-LEAVE-042 leave balance on dashboard matches API after apply, approve and cancel', async ({ browser, baseURL }) => {
  const reason = `E2E balance ${Date.now().toString(36).toUpperCase()}`;
  const fac = await asRole(browser, 'faculty', baseURL);

  async function fetchBalances(): Promise<Balance[]> {
    const res = await fac.request.get('/api/v1/dashboard/faculty');
    expect(res.ok()).toBeTruthy();
    return (await res.json()).data.balances as Balance[];
  }
  /** Loads the dashboard and asserts every balance card equals the API value. */
  async function assertCardsMatchApi(): Promise<Balance[]> {
    await fac.goto('/faculty/dashboard');
    await expect(fac.getByTestId('balances-list')).toBeVisible();
    const balances = await fetchBalances();
    expect(balances.length).toBeGreaterThan(0);
    for (const b of balances) {
      const left = Number(b.allotted) - Number(b.used);
      await expect(fac.getByTestId(`balance-${b.leaveType.code.toLowerCase()}`)).toContainText(`${left} left of ${Number(b.allotted)}`);
    }
    return balances;
  }
  const snapshot = (bs: Balance[]) => bs.map((b) => `${b.leaveType.code}:${Number(b.allotted)}:${Number(b.used)}`).sort();

  const baseline = await assertCardsMatchApi();

  const leave = new LeavePage(fac);
  await leave.goto();
  const date = futureWeekday();
  await leave.apply(date, reason);
  const row = leave.row(uiDate(date)).first();
  await expect(row).toBeVisible();
  await assertCardsMatchApi(); // step 1: applied (pending)

  const hod = await asRole(browser, 'hod', baseURL);
  const approvals = new ApprovalsPage(hod);
  await approvals.goto();
  await approvals.approve('leave', reason);
  await expect(hod.getByTestId('approvals-table-leave').locator('tr').filter({ hasText: reason })).toHaveCount(0);
  await assertCardsMatchApi(); // step 2: approved

  await leave.goto();
  const approvedRow = leave.row(uiDate(date)).first();
  await expect(approvedRow).toContainText(/approved/i);
  await approvedRow.locator('[data-testid^="leave-cancel-"]').click();
  await fac.getByTestId('leave-cancel-confirm').click();
  await expect(leave.row(uiDate(date)).first()).toContainText(/cancel/i);
  const after = await assertCardsMatchApi(); // step 3: cancelled
  expect(snapshot(after)).toEqual(snapshot(baseline)); // cancelled leave returns to balance
});

// ---------- TC-HOL-006 ----------
for (const role of ROLES) {
  test(`TC-HOL-006 all holidays visible to ${role}`, async ({ browser, baseURL }) => {
    const page = await asRole(browser, role, baseURL);
    const year = new Date().getFullYear();
    const res = await page.request.get('/api/v1/holidays', { params: { year } });
    expect(res.ok()).toBeTruthy();
    const holidays = (await res.json()).data as { date: string; name: string }[];
    expect(holidays.length).toBeGreaterThan(0);
    await page.goto(`/${role}/holidays`);
    await expect(page.getByTestId('holidays-table')).toBeVisible();
    for (const h of holidays) {
      const r = page.getByTestId(`holiday-row-${h.date}`).filter({ hasText: h.name });
      await expect(r.first(), `${h.date} ${h.name}`).toBeVisible();
    }
  });
}

// ---------- TC-NFR-004 ----------
test('TC-NFR-004 API responses carry security headers (helmet)', async ({ request }) => {
  const res = await request.get(`${API}/health`);
  expect(res.ok()).toBeTruthy();
  const h = res.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBeTruthy();
  expect(h['strict-transport-security']).toBeTruthy();
  expect(h['content-security-policy']).toBeTruthy();
});

// ---------- TC-NFR-008 ----------
test.describe('TC-NFR-008 responsive layout has no horizontal scroll', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'chromium', 'viewport sweep runs on the chromium project only');
  });
  const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

  for (const width of [375, 768, 1440]) {
    test(`TC-NFR-008 /login at ${width}px`, async ({ browser, baseURL }) => {
      const ctx = await browser.newContext({ baseURL, viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      await page.goto('/login');
      await expect(page.getByTestId('login-form')).toBeVisible();
      expect(await noHScroll(page)).toBe(true);
      await ctx.close();
    });
    for (const role of ROLES) {
      test(`TC-NFR-008 ${role} dashboard at ${width}px`, async ({ browser, baseURL }) => {
        const ctx = await browser.newContext({ baseURL, storageState: authFile(role), viewport: { width, height: 800 } });
        const page = await ctx.newPage();
        await page.goto(dash(role));
        await expect(page).toHaveURL(new RegExp(dash(role)));
        await page.waitForLoadState('networkidle');
        expect(await noHScroll(page)).toBe(true);
        await ctx.close();
      });
    }
  }
});

// ---------- TC-NFR-009 ----------
async function contrastRatio(page: Page): Promise<number> {
  return page.evaluate(() => {
    const toRgb = (css: string): [number, number, number, number] => {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.clearRect(0, 0, 1, 1);
      g.fillStyle = css;
      g.fillRect(0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    let bg: [number, number, number, number] = [255, 255, 255, 255];
    for (let el: Element | null = document.body; el; el = el.parentElement) {
      const c = toRgb(getComputedStyle(el).backgroundColor);
      if (c[3] > 0) {
        bg = c;
        break;
      }
    }
    const fg = toRgb(getComputedStyle(document.body).color);
    const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    return (l1 + 0.05) / (l2 + 0.05);
  });
}

async function assertDarkMode(page: Page) {
  const toggle = page.getByTestId('theme-toggle');
  await expect(toggle).toBeVisible();
  if ((await page.locator('html').getAttribute('data-theme')) !== 'dark') await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await contrastRatio(page)).toBeGreaterThanOrEqual(4.5);
}

test('TC-NFR-009 dark mode on login keeps text contrast >= 4.5', async ({ page }) => {
  await page.goto('/login');
  await assertDarkMode(page);
});

test('TC-NFR-009 dark mode on dashboard keeps text contrast >= 4.5', async ({ browser, baseURL }) => {
  const page = await asRole(browser, 'faculty', baseURL);
  await page.goto('/faculty/dashboard');
  await assertDarkMode(page);
});

// ---------- TC-NFR-010 ----------
test('TC-NFR-010 login is fully keyboard operable with visible focus', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByTestId('login-form')).toBeVisible();
  const active = () => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '');
  const outline = () => page.evaluate(() => (document.activeElement ? getComputedStyle(document.activeElement).outlineStyle : 'none'));

  let reached = false;
  for (let i = 0; i < 15 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = (await active()) === 'login-email';
  }
  expect(reached, 'email field reachable with Tab').toBe(true);
  expect(await outline()).not.toBe('none');
  await page.keyboard.type(ACCOUNTS.faculty.email);

  await page.keyboard.press('Tab');
  expect(await active()).toBe('login-password');
  expect(await outline()).not.toBe('none');
  await page.keyboard.type(ACCOUNTS.faculty.password);

  await page.keyboard.press('Tab');
  expect(await active()).toBe('login-submit');
  expect(await outline()).not.toBe('none');

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/faculty\/dashboard/);
});

// ---------- TC-NFR-011 ----------
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
async function axeScan(page: Page, testInfo: import('@playwright/test').TestInfo) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(
      bad.map((v) => ({ id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })),
      null,
      2,
    ),
    contentType: 'application/json',
  });
  expect(bad.map((v) => `${v.id} (${v.impact}, ${v.nodes.length} nodes)`)).toEqual([]);
}

test('TC-NFR-011 axe scan /login has no serious or critical violations', async ({ page }, testInfo) => {
  await page.goto('/login');
  await expect(page.getByTestId('login-form')).toBeVisible();
  await axeScan(page, testInfo);
});

for (const role of ROLES) {
  test(`TC-NFR-011 axe scan ${role} dashboard has no serious or critical violations`, async ({ browser, baseURL }, testInfo) => {
    const page = await asRole(browser, role, baseURL);
    await page.goto(dash(role));
    await page.waitForLoadState('networkidle');
    await axeScan(page, testInfo);
  });
}

// ---------- Regressions ----------
test('REG-DEF-001 faculty dashboard logs no duplicate-key React console error', async ({ browser, baseURL }) => {
  const page = await asRole(browser, 'faculty', baseURL);
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/faculty/dashboard');
  await expect(page.getByTestId('balances-list')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(errors.filter((t) => t.includes('unique "key" prop'))).toEqual([]);
});

test('REG-DEF-002 admin dashboard pending KPI tiles are not links', async ({ browser, baseURL }) => {
  const page = await asRole(browser, 'admin', baseURL);
  await page.goto('/admin/dashboard');
  await expect(page.getByTestId('kpi-pending-leaves-link')).toBeVisible();
  await expect(page.getByTestId('kpi-pending-reg-link')).toBeVisible();
  await expect(page.locator('[data-testid=kpi-pending-leaves-link] a')).toHaveCount(0);
  await expect(page.locator('[data-testid=kpi-pending-reg-link] a')).toHaveCount(0);
  await expect(page.locator('a[href^="/admin/approvals"]')).toHaveCount(0);
});

