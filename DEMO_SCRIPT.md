# FAMS Demo Script

All data is synthetic seed data. Start the API (`npm run dev`, port 4000) and web (`npm run dev --workspace apps/web`, port 3000), open http://localhost:3000.
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
- Jest/Supertest and coverage: [06 Test Reports](06_Test_Reports)
- Playwright report: `apps/web/playwright-report` (after `npm run test:e2e`)
- Mutation report: [05 Test Automation](05_Test_Automation)
- Defects: [04 Defect Reports](04_Defect_Reports)
- API docs: http://localhost:4000/api/docs
