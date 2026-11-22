# Mutation Testing (Stryker)

Tool: Stryker 10 with the Jest runner and TypeScript checker. Unit tests only (`apps/api/jest.unit.config.js`, no database).
Mutated files: the pure rule modules under `apps/api/src/services` plus `src/utils/dates.ts` (10 files, 850 mutants).
Thresholds: high 85, low 70, break 65. Commands: `npm run test:mutation`, `npm run test:mutation:changed` (incremental).

## Baseline (measured)
Mutation score **86.19%** (covered-code score 87.14%): 543 killed, 6 timeout, 81 survived, 7 no coverage, 213 compile errors (ignored by Stryker).

| File | Score | Survived |
|---|---|---|
| attendanceRules.ts | 90.91 | 7 |
| csvImport.ts | 81.88 | 20 (+5 no cov) |
| employeeId.ts | 72.73 | 3 |
| leaveRules.ts | 82.01 | 25 |
| lockout.ts | 94.44 | 1 |
| passwordPolicy.ts | 100.00 | 0 |
| regularizationRules.ts | 80.00 | 15 |
| reportRules.ts | 90.74 | 5 |
| shiftRules.ts | 96.55 | 2 |
| utils/dates.ts | 84.85 | 3 (+2 no cov) |

The baseline meets the 70% target and the 85 "high" threshold.

## Survivors and killer tests
Most survivors are error-message string literals and regex anchors. `tests/unit/mutationKillers.test.ts` (14 tests, passing) was added to assert exact messages, the `^`/`$` anchors of the employee ID and HH:mm patterns, and the approved-leave cancel boundary (start date today vs tomorrow).

**After score (measured, full run 7 min 12 s):** mutation score **89.95%** (covered-code score 90.95%): 567 killed, 6 timeout, 57 survived, 7 no coverage, 213 compile errors (ignored). Up from 86.19% before the killer tests. Biggest gains: `regularizationRules.ts` 80.00 to 100.00, `employeeId.ts` 72.73 to 90.91, `leaveRules.ts` 82.01 to 87.05. `csvImport.ts` (81.88) and `utils/dates.ts` (84.85) are the weakest files. The report is in `06_Test_Reports/mutation/`.

Known unkillable survivor: `employeeId.ts` `n > max` to `n >= max` is an equivalent mutant (same result).

## Setup note
`jest.unit.config.js` now locates the pdfkit bundle by walking up from its own directory, because Stryker runs tests in `apps/api/.stryker-tmp/sandbox-*` where the old `<rootDir>/../../node_modules` path did not resolve.
