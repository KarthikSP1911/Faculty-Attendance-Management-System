import path from 'node:path';
import { test, asRole } from './fixtures';

// Writes screenshots of key screens (SYNTHETIC demo data) to 07_Screenshots/.
const OUT = path.join(__dirname, '..', '..', '..', '07_Screenshots');

const SHOTS: Array<{ role: 'admin' | 'hod' | 'faculty'; url: string; name: string }> = [
  { role: 'faculty', url: '/faculty/dashboard', name: 'faculty-dashboard' },
  { role: 'faculty', url: '/faculty/leave', name: 'faculty-leave' },
  { role: 'faculty', url: '/faculty/regularization', name: 'faculty-regularization' },
  { role: 'hod', url: '/hod/dashboard', name: 'hod-dashboard' },
  { role: 'hod', url: '/hod/approvals', name: 'hod-approvals' },
  { role: 'admin', url: '/admin/dashboard', name: 'admin-dashboard' },
  { role: 'admin', url: '/admin/faculty', name: 'admin-faculty' },
  { role: 'admin', url: '/admin/reports', name: 'admin-reports' },
  { role: 'admin', url: '/admin/audit', name: 'admin-audit' },
];

for (const s of SHOTS) {
  test(`screenshot ${s.name}`, async ({ browser, baseURL }) => {
    const page = await asRole(browser, s.role, baseURL);
    await page.goto(s.url);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(OUT, `${s.name}.png`), fullPage: true });
  });
}

// Public pages (no login) and theme / viewport variants. All data is synthetic.
test('screenshot landing', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(OUT, 'landing.png'), fullPage: true });
});

test('screenshot login', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(OUT, 'login.png') });
});

test('screenshot admin-dashboard-dark', async ({ browser, baseURL }) => {
  const page = await asRole(browser, 'admin', baseURL);
  await page.addInitScript(() => localStorage.setItem('fams-theme', 'dark'));
  await page.goto('/admin/dashboard');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(OUT, 'admin-dashboard-dark.png'), fullPage: true });
});

test('screenshot faculty-dashboard-mobile', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ storageState: 'e2e/.auth/faculty.json', baseURL, viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('/faculty/dashboard');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(OUT, 'faculty-dashboard-mobile.png'), fullPage: true });
});
