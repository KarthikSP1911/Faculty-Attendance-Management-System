# Assumptions

Where the requirements were silent, these decisions were made. Each was checked against the code.

| # | Assumption | Code |
|---|---|---|
| A1 | Every third Late in a calendar month is a Half Day deduction (`lateLimitPerMonth` = 3 by default; 0 disables). | `isLateDeduction` in `apps/api/src/services/attendanceRules.ts` (REQ-RULE-06) |
| A2 | An open check-in with no check-out is closed as Half Day by the end-of-day job, with a missed check-out notification. | `apps/api/src/jobs/absentJob.ts` |
| A3 | Leave may start up to 30 days in the past and up to 365 days ahead, and may not span two calendar years (split into two requests). | `BACKDATE_LIMIT_DAYS`, `ADVANCE_LIMIT_DAYS`, span check in `apps/api/src/services/leaveRules.ts` |
| A4 | The monthly regularization limit counts requests by the month they were created (IST), not the month of the attendance date. | `create` in `apps/api/src/services/regularizationService.ts` |
| A5 | Faculty report percentage: (Present + Late + 0.5 × Half Day + On Leave − 0.5 × late-deductions) / working days × 100, clamped to 0–100. | `apps/api/src/services/reportRules.ts` (REQ-RPT-04) |
