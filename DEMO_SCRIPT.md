# FAMS Demo Script

All data is synthetic seed data. Start the database (`docker compose up -d db`), the API (`npm run dev`, port 4000) and web (`npm run dev --workspace apps/web`, port 3000), open http://localhost:3000. Use the theme toggle (top bar) to show dark mode.
Password for every account: `Demo@1234`.

| Role | Email |
|---|---|
| Admin | `admin@fams.test` |
| HOD (CSE) | `hod.cse@fams.test` |
| Faculty (CSE) | `cse.faculty1@fams.test` |

## 1. Faculty (cse.faculty1@fams.test)
1. Log in, land on `/faculty/dashboard`.
2. Check in / check out on the dashboard card. Check-in is allowed only **07:00–12:00 IST**; outside it the card shows the blocked message.
3. `/faculty/attendance`: monthly calendar and legend.
4. `/faculty/leave`: check balances, apply for leave on a future weekday, see it in the table.
5. `/faculty/regularization`: request a correction for a past date.
6. Bell icon: notifications; use the back control to return.

## 2. HOD (hod.cse@fams.test)
1. `/hod/dashboard`: pending leave and regularization counts.
2. `/hod/approvals`: approve the leave and regularization requests from step 1 (comment is optional).
3. `/hod/attendance`, `/hod/faculty`: department view.

## 3. Admin (admin@fams.test)
1. `/admin/dashboard`: KPIs and department chart.
2. `/admin/departments`: add a department, then delete it.
3. `/admin/faculty`: create a faculty member (temporary password is shown once).
4. `/admin/rules`, `/admin/holidays`: attendance rules and holidays.
5. `/admin/reports`: choose a report, export CSV or PDF.
6. `/admin/audit`: see the actions above recorded.

## 4. Show the testing portfolio
Folder map (same order as the assignment): [01 Test Plan](01_Test_Plan) · [02 Test Case Design](02_Test_Case_Design) · [03 Test Execution](03_Test_Execution) · [04 Defect Reports](04_Defect_Reports) · [05 Test Automation](05_Test_Automation) · [06 Test Reports](06_Test_Reports) · [07 Screenshots](07_Screenshots) · [Conclusion](Conclusion.md)

- **Application and scope:** student/faculty attendance management; modules are auth, faculty, departments, attendance, leave, regularization, holidays, reports, notifications, audit (see the requirements traceability matrix in 01).
- **Techniques (02):** equivalence partitioning, boundary value analysis, decision tables, state transition, error guessing; 255 designed cases in `Test_Cases.md`.
- **Execution (03):** `Test_Execution_Summary.md`: 254 of 255 executed, 254 passed, 0 failed; TC-NFR-012 (Lighthouse) not executed.
- **Automation (05, 06):** Jest + Supertest 440 tests (98.25% line coverage); Playwright 164 tests on four browser profiles (126 passed, 0 failed, 38 skipped by design); StrykerJS mutation score 89.95% (baseline 86.19%). Open `06_Test_Reports/jest-coverage/index.html`, `06_Test_Reports/playwright-report/index.html`, `06_Test_Reports/mutation/mutation.html`.
- **Defects (04):** DEF-001 (React duplicate key on faculty dashboard) and DEF-002 (admin tiles linking to a missing page): each has reproduction steps, root cause, fix commit and a regression test (`REG-DEF-001`, `REG-DEF-002` in `apps/web/e2e/specs/manual-cases.spec.ts`).
- **Live regeneration:** `npm run reports` rebuilds the execution log and report copies from the latest runs; `npm run screenshots` refreshes the screenshots.
- API docs: http://localhost:4000/api/docs

## 5. Likely viva questions (short answers)
- *Why these techniques?* EP/BVA for inputs with ranges (late cut-off, 7 h present, token expiry); decision tables for the attendance status rules; state transition for leave, regularization and refresh tokens.
- *How do you know the tests are good?* Mutation testing: 89.95% of injected faults on the rule files are caught; survivors are listed in `05_Test_Automation/Mutation_Testing.md`.
- *What could not be tested?* Lighthouse scoring (TC-NFR-012); the server clock cannot be frozen from the browser, so the check-in journey asserts the blocked state outside 07:00-12:00 IST; mutation testing covers only the pure rule files.
- *Where is the evidence?* The execution log maps every case to an automated test; Jest results are file-level because test names do not carry case IDs.
