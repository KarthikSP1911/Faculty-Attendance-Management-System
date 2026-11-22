import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}
  goto() { return this.page.goto('/login'); }
  async login(email: string, password: string) {
    await this.page.getByTestId('login-email').fill(email);
    await this.page.getByTestId('login-password').fill(password);
    await this.page.getByTestId('login-submit').click();
  }
  error() { return this.page.getByTestId('login-error'); }
}

export class LeavePage {
  constructor(private page: Page) {}
  goto() { return this.page.goto('/faculty/leave'); }
  async apply(date: string, reason: string) {
    await this.page.getByTestId('leave-type').selectOption({ index: 1 });
    await this.page.getByTestId('leave-start').fill(date);
    await this.page.getByTestId('leave-end').fill(date);
    await this.page.getByTestId('leave-reason').fill(reason);
    await this.page.getByTestId('leave-apply-submit').click();
  }
  row(text: string) { return this.page.getByTestId('leave-table').locator('tr').filter({ hasText: text }); }
}

export class RegularizationPage {
  constructor(private page: Page) {}
  goto() { return this.page.goto('/faculty/regularization'); }
  async submit(date: string, inTime: string, outTime: string, reason: string) {
    await this.page.getByTestId('reg-date').fill(date);
    await this.page.getByTestId('reg-check-in').fill(inTime);
    await this.page.getByTestId('reg-check-out').fill(outTime);
    await this.page.getByTestId('reg-reason').fill(reason);
    await this.page.getByTestId('reg-submit').click();
  }
}

export class ApprovalsPage {
  constructor(private page: Page) {}
  goto() { return this.page.goto('/hod/approvals'); }
  async approve(kind: 'leave' | 'regularization', rowText: string) {
    await this.page.getByTestId(`approvals-tab-${kind}`).click();
    const row = this.page.getByTestId(`approvals-table-${kind}`).locator('tr').filter({ hasText: rowText });
    await row.locator('[data-testid^="approve-"]').click();
    await this.page.getByTestId('review-confirm').click();
  }
}

export class DepartmentsPage {
  constructor(private page: Page) {}
  goto() { return this.page.goto('/admin/departments'); }
  async create(name: string, code: string) {
    await this.page.getByTestId('department-create-open').click();
    await this.page.getByTestId('department-name').fill(name);
    await this.page.getByTestId('department-code').fill(code);
    await this.page.getByTestId('department-save').click();
  }
  row(code: string) { return this.page.getByTestId(`department-row-${code}`); }
  async remove(code: string) {
    await this.page.getByTestId(`department-delete-${code}`).click();
    await this.page.getByTestId('department-delete-confirm').click();
  }
}
