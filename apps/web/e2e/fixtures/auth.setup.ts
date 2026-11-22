import { test as setup, expect } from '@playwright/test';
import { ACCOUNTS, authFile, type Role } from './accounts';

for (const role of Object.keys(ACCOUNTS) as Role[]) {
  setup(`authenticate ${role}`, async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(ACCOUNTS[role].email);
    await page.getByTestId('login-password').fill(ACCOUNTS[role].password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(new RegExp(`/${role}/dashboard`), { timeout: 45_000 });
    await page.context().storageState({ path: authFile(role) });
  });
}
