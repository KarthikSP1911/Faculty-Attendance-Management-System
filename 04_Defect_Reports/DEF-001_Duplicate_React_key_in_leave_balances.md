# DEF-001: Faculty dashboard logs a React duplicate-key error in the leave balances list

| Field | Value |
|---|---|
| Severity | Low |
| Found in | Faculty dashboard (`/faculty/dashboard`), leave balances card |
| How found | Next.js dev overlay ("1 Issue") while checking the faculty dashboard in the browser, 2026-11-22 |
| Status | Fixed (fix is in the working tree; commit hash to be added when committed) |

## Steps to reproduce
1. Start the web app in dev mode (`npm run dev --workspace apps/web`).
2. Log in as `cse.faculty1@fams.test` (password in the README, synthetic data).
3. Open `/faculty/dashboard`.

## Expected
No console errors.

## Actual
Console error: `Each child in a list should have a unique "key" prop. Check the render method of ul. It was passed a child from FacultyDashboardView` (`src/features/faculty-dashboard.tsx`, the `<li key={b.id}>` in `balances-list`).

## Root cause
The list used `b.id` as the React key, but the dashboard API returns balances without an `id`, so every key was `undefined`. React cannot track the items reliably, which risks wrong re-renders when balances change.

## Fix
Key the list on `b.leaveType.code`, which is unique per leave type.

Commit: `<pending: add hash after commit>`

## Regression test
File: `apps/web/e2e/specs/manual-cases.spec.ts`, test name: `REG-DEF-001 faculty dashboard logs no duplicate-key React console error`.
