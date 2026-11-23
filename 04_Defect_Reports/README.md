# Defect Reports

All data in this project is synthetic.

## Defects found

| ID | Title | Severity | Status | Report |
|---|---|---|---|---|
| DEF-001 | Faculty dashboard logs a React duplicate-key error in the leave balances list | Low | Fixed (525af7a) | [DEF-001](DEF-001_Duplicate_React_key_in_leave_balances.md) |
| DEF-002 | Admin dashboard pending-leave and pending-regularization tiles link to a missing page | Medium | Fixed (525af7a) | [DEF-002](DEF-002_Admin_KPI_tiles_link_to_missing_page.md) |
| DEF-003 | Landing page performance score 34 in Lighthouse (target 90) | Medium | Fixed (2b8f31b) | [DEF-003](DEF-003_Landing_page_performance_score_34.md) |

DEF-001 and DEF-002 were found while verifying the UI refresh (2026-11-22) and each has a regression test in `apps/web/e2e/specs/manual-cases.spec.ts`. DEF-003 was found by the Lighthouse run for TC-NFR-012 (2026-11-23); its regression check is `npm run lighthouse`. The Jest suites (440 tests) found no product defects.

A defect report is only added when it has a reproducible failing test or run, a fix commit hash and a regression test that exists in the repo. Use [DEFECT_TEMPLATE.md](DEFECT_TEMPLATE.md).

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
| DEV-07 | TC-LEAVE-042 and J4 failed intermittently (a 90 s timeout, later "row not found"): the test picked a random future date that sometimes overlapped an existing leave, so the server rejected the request and the row never appeared | `LeavePage.applyOnFreeDate` retries with another date on overlap and fails clearly on any other error; Playwright `actionTimeout` set to 15 s so a stuck step names itself |
| DEV-08 | J5 failed once in WebKit at the login redirect in one full run; it passed on every re-run and in the next full runs | Not reproduced; recorded for transparency, no change made |
