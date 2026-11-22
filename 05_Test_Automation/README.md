# Test Automation

All test data is synthetic. Run numbers are in `06_Test_Reports` (not repeated here).

## Layers

| Layer | Tool | Location | Command |
|---|---|---|---|
| Unit (pure rules, no DB) | Jest + ts-jest | `apps/api/tests/unit` | `npx jest -c jest.unit.config.js` (in `apps/api`) / `npm run test:unit` |
| Integration (API + DB, Supertest) | Jest | `apps/api/tests/integration` | `npm run test:integration` |
| Full run with coverage | Jest `--runInBand --coverage` | both | `npm test` (root) |
| End-to-end | Playwright | `apps/web/e2e` | `npm run test:e2e` (root) |
| Screenshots | Playwright | `apps/web/e2e/screenshots.spec.ts` | `npm run screenshots` |
| Mutation | Stryker | `apps/api/stryker.config.json` | `npm run test:mutation`, `test:mutation:changed` |

## Jest

- `jest.config.js`: ts-jest, node env, 60 s timeout, coverage thresholds 85% lines / 80% branches, junit report to `reports/junit`.
- `jest.unit.config.js`: unit tests only, 10 s timeout, no thresholds; used by Stryker.
- `pdfkit` is mapped to its standalone CJS bundle (Jest cannot load its ESM `fontkit`).
- Helpers in `tests/helpers`: `env.ts`, `db.ts` (`resetDb`, `createUser`), `fixtures.ts`, `time.ts`.

## Database isolation

`tests/helpers/env.ts` points `DATABASE_URL` at `TEST_DATABASE_URL` and throws if it is missing or equal to the main URL. Integration tests run in the Postgres schema `fams_test` (`&schema=fams_test` on the `TEST_*` URLs). `resetDb()` truncates every table in that schema and refuses to run on `public`. Playwright runs against the `public` (seeded demo) schema.

## globalLock

`tests/helpers/globalLock.js` (Jest `globalSetup`) takes a lock file `fams-jest.lock` in the OS temp dir; a second Jest process waits (up to 20 min, stale locks of dead PIDs are removed) instead of truncating tables under the first. `globalUnlock.js` releases it. Never run two Jest processes manually in parallel.

## Clock freezing

Business code calls `clock.now()` from `src/utils/clock.ts`. Tests use `freezeClock(date)`, `setClock()` and `resetClock()` to make punch windows, late rules and the absent job deterministic. The check-in window is 07:00–12:00 IST; the Playwright check-in journey cannot freeze the server clock, so outside the window it asserts the blocked state instead of checking in.

## Playwright

`apps/web/playwright.config.ts`: a `setup` project logs in as admin, HOD and faculty and saves `storageState` under `e2e/.auth/` (gitignored); projects `chromium`, `firefox`, `webkit`, `iphone-14` depend on it; `screenshots` writes to `07_Screenshots`. One worker, trace on first retry, screenshots/video on failure, HTML report in `playwright-report/`. Page objects in `e2e/pages/pages.ts`; nine journeys in `e2e/specs/journeys.spec.ts`. Servers are reused if already running (API port 4000, web port 3000).

## Stryker

`stryker.config.json`: jest runner with the unit config, TypeScript checker, `coverageAnalysis: perTest`, thresholds high 85 / low 70 / break 65, reporters html, clear-text, progress, json (`reports/mutation/`). Mutates only the pure rule files (passwordPolicy, lockout, employeeId, csvImport, shiftRules, attendanceRules, leaveRules, regularizationRules, reportRules, utils/dates). `.stryker-tmp/` is gitignored. Scores: see `Mutation_Testing.md`.
