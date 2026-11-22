# DEF-002: Admin dashboard "Pending leave" and "Pending regularization" tiles link to a page that does not exist

| Field | Value |
|---|---|
| Severity | Medium |
| Found in | Admin dashboard (`/admin/dashboard`), KPI tiles |
| How found | Playwright run, 2026-11-22: the `screenshots` project test "screenshot admin-dashboard" timed out at `waitForLoadState('networkidle')`; a diagnostic run showed the page kept requesting `/admin/approvals?tab=leave&_rsc=...` (route prefetch) and never went idle |
| Status | Fixed (commit 525af7a) |

## Steps to reproduce
1. Log in as `admin@fams.test`.
2. Open `/admin/dashboard`.
3. Click the "Pending leave" or "Pending regularization" tile (or wait: Next.js prefetches the link target).

## Expected
The tile either opens a working page or is not a link.

## Actual
Both tiles were links to `/admin/approvals?tab=leave` and `/admin/approvals?tab=regularization`. There is no `/admin/approvals` route (admin routes are audit, dashboard, departments, faculty, holidays, notifications, reports, rules), so the link ends in a 404 and the prefetch request keeps failing, which also stopped the page from becoming network-idle.

## Root cause
The dashboard linked to an approvals page that was only ever built for the HOD role (`/hod/approvals`).

## Fix
The two tiles are now plain tiles (no link). The `kpi-pending-leaves-link` and `kpi-pending-reg-link` test ids are kept on the wrappers.

Commit: `525af7a` (feat(web): Fluent-style UI refresh ...)

## Regression test
File: `apps/web/e2e/specs/manual-cases.spec.ts`, test name: `REG-DEF-002 admin dashboard pending KPI tiles are not links`.
