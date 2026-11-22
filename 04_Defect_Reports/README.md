# Defect Reports

All data in this project is synthetic.

## Defects found

| ID | Title | Severity | Status | Report |
|---|---|---|---|---|
| DEF-001 | Faculty dashboard logs a React duplicate-key error in the leave balances list | Low | Fixed (commit hash pending) | [DEF-001](DEF-001_Duplicate_React_key_in_leave_balances.md) |
| DEF-002 | Admin dashboard pending-leave and pending-regularization tiles link to a missing page | Medium | Fixed (commit hash pending) | [DEF-002](DEF-002_Admin_KPI_tiles_link_to_missing_page.md) |

Both were found while verifying the UI refresh (2026-11-22) and each has a regression test in `apps/web/e2e/specs/manual-cases.spec.ts`. The Jest suites (440 tests) found no product defects.

A defect report is only added when it has a reproducible failing test or run, a fix commit hash and a regression test that exists in the repo. The commit hashes for DEF-001 and DEF-002 are left as placeholders until the fixes are committed. Use [DEFECT_TEMPLATE.md](DEFECT_TEMPLATE.md).

## Development issues (tooling, not product defects)

Recorded in the build handoff; none affect product behaviour.

| Ref | Issue | Resolution |
|---|---|---|
| DEV-01 | Jest cannot load pdfkit's ESM-only `fontkit` dependency | `moduleNameMapper` maps `pdfkit` to its standalone CJS bundle (`apps/api/jest.config.js`, `jest.unit.config.js`) |
| DEV-02 | Neon queries were slow (up to ~450 ms each), causing 90 s test timeouts on slow days | Moved to local Docker Postgres; integration `testTimeout` now 60 s |
| DEV-03 | Two Jest runs sharing schema `fams_test` truncated each other's tables | `tests/helpers/globalLock.js` queues runs |
| DEV-04 | TypeScript version choice (reason not recorded in the handoff) | TypeScript pinned to ~5.9 |
| DEV-05 | `scarf` install scripts | Kept blocked |
| DEV-06 | New spec `manual-cases.spec.ts`: the chromium-only skip used a callback that Playwright does not pass test info to, so TC-NFR-008 errored in all four projects on the first run | Replaced with a `beforeEach` that calls `test.skip` using `testInfo.project.name`; re-run green |
| DEV-07 | TC-LEAVE-042 hit the 90 s test timeout once in the first run after the spec was added; it passed on every re-run (alone and in the full suites) | Not reproduced; recorded here for transparency, no change made |
