# Requirements Traceability Matrix (RTM)

Test case IDs below are the planned ranges; individual cases are listed in `02_Test_Case_Design/Test_Cases.md`. "Automated test file" paths are the planned locations. Status is updated as tests are written and executed (Planned → Implemented → Passed).

Legend: U = unit (Jest), I = integration (Jest + Supertest), E = end-to-end (Playwright), M = manual.

| Requirement ID | Requirement | Test Case IDs | Automated test file | Status |
|---|---|---|---|---|
| REQ-AUTH-01 | Login with email + password; logout | TC-AUTH-001 – 005 | `apps/api/tests/integration/auth.test.ts`, `apps/web/e2e/auth.spec.ts` | Planned |
| REQ-AUTH-02 | Refresh-token rotation (old token rejected) | TC-AUTH-006 – 008 | `tests/integration/auth.test.ts` | Planned |
| REQ-AUTH-03 | Forgot/reset password: token valid 30 min, single use | TC-AUTH-009 – 013 | `tests/unit/resetToken.test.ts`, `tests/integration/auth.test.ts` | Planned |
| REQ-AUTH-04 | Change password | TC-AUTH-014 – 016 | `tests/integration/auth.test.ts` | Planned |
| REQ-AUTH-05 | Lockout: 5 failed logins lock for 15 min | TC-AUTH-017 – 021 | `tests/unit/lockout.test.ts`, `apps/web/e2e/auth.spec.ts` | Planned |
| REQ-AUTH-06 | Password policy: 8–64 chars, upper, lower, digit, special | TC-AUTH-022 – 031 | `tests/unit/passwordPolicy.test.ts` | Planned |
| REQ-DEPT-01 | Department CRUD; name 2–50 chars; code 2–6 uppercase letters, unique | TC-DEPT-001 – 008 | `tests/integration/departments.test.ts`, `tests/unit/validation.test.ts` | Passed |
| REQ-DEPT-02 | One HOD per department | TC-DEPT-009 – 010 | `tests/integration/departments.test.ts` | Passed |
| REQ-DEPT-03 | Cannot delete department with active faculty (409) | TC-DEPT-011 – 012 | `tests/integration/departments.test.ts` | Passed |
| REQ-FAC-01 | Faculty CRUD with field validation (name, email, phone 6–9 start, joining date not future, designation) | TC-FAC-001 – 012 | `tests/unit/validation.test.ts`, `tests/integration/faculty.test.ts` | Passed |
| REQ-FAC-02 | Auto-generated unique employee ID `FAC-0001` | TC-FAC-013 – 016 | `tests/unit/employeeId.test.ts`, `tests/integration/faculty.test.ts` | Passed |
| REQ-FAC-03 | Search, filter by department/status, sort, paginate (10/25/50) | TC-FAC-017 – 021 | `tests/integration/faculty.test.ts` | Passed |
| REQ-FAC-04 | CSV bulk import with row-level errors | TC-FAC-022 – 026 | `tests/unit/csvImport.test.ts`, `tests/integration/faculty.test.ts` | Passed |
| REQ-FAC-05 | Deactivated faculty cannot log in; history kept | TC-FAC-027 – 028 | `tests/integration/faculty.test.ts` | Passed |
| REQ-RULE-01 | Default shift 09:00–17:00 Mon–Sat; grace 0–60 min configurable | TC-RULE-001 – 005 | `tests/unit/validation.test.ts`, `tests/integration/settings.test.ts` | Passed |
| REQ-RULE-02 | Status by check-in: ≤09:15 On time, 09:16–10:30 Late, >10:30 Half Day | TC-RULE-006 – 013 | `tests/unit/computeDailyStatus.test.ts`, `tests/integration/attendance.test.ts` | Passed |
| REQ-RULE-03 | Status by worked hours: ≥7h Present, 4h–<7h Half Day, <4h Absent | TC-RULE-014 – 021 | `tests/unit/computeDailyStatus.test.ts`, `tests/integration/attendance.test.ts` | Passed |
| REQ-RULE-04 | No check-in on working day → Absent (nightly 23:59 job + admin trigger) | TC-RULE-022 – 025 | `tests/unit/punchWindow.test.ts`, `tests/integration/attendance.test.ts` | Passed |
| REQ-RULE-05 | Approved leave → On Leave; holiday → Holiday; Sunday → Weekly Off | TC-RULE-026 – 030 | `tests/unit/computeDailyStatus.test.ts`, `tests/integration/attendance.test.ts` | Passed |
| REQ-RULE-06 | 3rd Late in a month counts as one Half Day deduction | TC-RULE-031 – 034 | `tests/unit/punchWindow.test.ts`, `tests/integration/attendance.test.ts` | Passed |
| REQ-ATT-01 | One check-in and one check-out per day (second attempt → 409) | TC-ATT-001 – 005 | `tests/integration/attendance.test.ts` | Passed |
| REQ-ATT-02 | Check-in window 07:00–12:00; check-out until 23:00 | TC-ATT-006 – 013 | `tests/unit/punchWindow.test.ts`, `tests/integration/attendance.test.ts` | Passed |
| REQ-ATT-03 | No check-in on holiday, Sunday, approved leave (clear message) | TC-ATT-014 – 018 | `tests/integration/attendance.test.ts` | Passed |
| REQ-ATT-04 | Server time is source of truth (client time ignored) | TC-ATT-019 – 020 | `tests/integration/attendance.test.ts` | Passed |
| REQ-ATT-05 | Check-out must be after check-in; check-out requires check-in | TC-ATT-021 – 023 | `tests/unit/punchWindow.test.ts`, `tests/integration/attendance.test.ts` | Passed |
| REQ-REG-01 | Regularization within last 7 days; reason 10–300 chars | TC-REG-001 – 008 | `tests/unit/regularization.test.ts`, `tests/integration/leave.test.ts` | Passed |
| REQ-REG-02 | Max 3 regularization requests per month | TC-REG-009 – 011 | `tests/unit/regularization.test.ts`, `tests/integration/leave.test.ts` | Passed |
| REQ-REG-03 | HOD approve/reject with comment; approval recomputes day status | TC-REG-012 – 016 | `tests/integration/leave.test.ts` | Passed |
| REQ-LEAVE-01 | Leave types and yearly balances (CL 12, SL 10, EL 15, On Duty unlimited) | TC-LEAVE-001 – 004 | `tests/integration/leave.test.ts` | Passed |
| REQ-LEAVE-02 | Apply rules: 1–15 working days, date window, no overlap, within balance | TC-LEAVE-005 – 018 | `tests/unit/validateLeaveRequest.test.ts`, `tests/integration/leave.test.ts` | Passed |
| REQ-LEAVE-03 | Half-day leave (first/second half) | TC-LEAVE-019 – 021 | `tests/unit/validateLeaveRequest.test.ts` | Passed |
| REQ-LEAVE-04 | State machine: Draft→Pending→Approved/Rejected; Pending→Cancelled; Approved→Cancelled only if future; others 409 | TC-LEAVE-022 – 034 | `tests/unit/validateLeaveRequest.test.ts`, `tests/integration/leave.test.ts` | Passed |
| REQ-LEAVE-05 | HOD approves own department only; Admin any | TC-LEAVE-035 – 039 | `tests/integration/leave.test.ts` | Passed |
| REQ-LEAVE-06 | Cancelling approved leave restores balance | TC-LEAVE-040 – 042 | `tests/integration/leave.test.ts` | Passed |
| REQ-HOL-01 | Holiday CRUD (date, name, type) | TC-HOL-001 – 005 | `tests/integration/settings.test.ts` | Passed |
| REQ-HOL-02 | Calendar view visible to all roles | TC-HOL-006 – 007 | `apps/web/e2e/holidays.spec.ts` | Planned |
| REQ-DASH-01 | Faculty dashboard (status, monthly counts, %, balances) | TC-DASH-001 – 003 | `tests/integration/reports.test.ts` | Passed |
| REQ-DASH-02 | HOD dashboard (department today, approvals, 30-day trend) | TC-DASH-004 – 006 | `tests/integration/reports.test.ts` | Passed |
| REQ-DASH-03 | Admin dashboard (KPIs, department comparison, defaulters < 75 %) | TC-DASH-007 – 010 | `tests/integration/reports.test.ts` | Passed |
| REQ-RPT-01 | Daily / monthly / custom range reports with filters | TC-RPT-001 – 006 | `tests/integration/reports.test.ts` | Passed |
| REQ-RPT-02 | Monthly muster roll with codes P/L/HD/A/OL/H/WO | TC-RPT-007 – 009 | `tests/unit/calculateAttendancePercentage.test.ts`, `tests/integration/reports.test.ts` | Passed |
| REQ-RPT-03 | Export CSV and PDF | TC-RPT-010 – 013 | `tests/unit/calculateAttendancePercentage.test.ts`, `tests/integration/reports.test.ts` | Passed |
| REQ-RPT-04 | Attendance % = (Present + 0.5·Half Day + On Leave) ÷ Working Days × 100, 2 decimals | TC-RPT-014 – 022 | `tests/unit/calculateAttendancePercentage.test.ts` | Passed |
| REQ-NOT-01 | In-app notifications (leave result, regularization result, missed check-out) | TC-NOT-001 – 005 | `tests/integration/reports.test.ts`, `tests/integration/leave.test.ts` | Passed |
| REQ-AUD-01 | Audit log for create/update/delete and admin corrections; admin-only viewer | TC-AUD-001 – 005 | `tests/integration/reports.test.ts` (viewer), every resource suite (writer) | Passed |
| REQ-RBAC-01 | Role checks enforced by backend middleware (401 unauthenticated, 403 wrong role) | TC-RBAC-001 – 008 | `tests/integration/rbac.test.ts` | Passed |
| REQ-RBAC-02 | Faculty cannot read another faculty member's data | TC-RBAC-009 – 011 | `tests/integration/rbac.test.ts` | Passed |
| REQ-RBAC-03 | HOD limited to own department | TC-RBAC-012 – 014 | `tests/integration/rbac.test.ts`, `apps/web/e2e/rbac.spec.ts` | Passed |
| REQ-NFR-01 | Security: helmet, CORS allowlist, rate limit 10 req/min/IP on `/auth/*` (429) | TC-NFR-001 – 004 | `tests/integration/security.test.ts` | Planned |
| REQ-NFR-02 | Response envelope `{success,data,error}` and correct status codes; Zod 400 with field details | TC-NFR-005 – 007 | `tests/integration/envelope.test.ts` | Planned |
| REQ-NFR-03 | Responsive 375–1440 px, dark mode, keyboard navigation, WCAG 2.1 AA | TC-NFR-008 – 011 | `apps/web/e2e/ui.spec.ts`, manual | Planned |
| REQ-NFR-04 | Lighthouse ≥ 90 (Performance, Accessibility, Best Practices) | TC-NFR-012 | manual (report in `06_Test_Reports`) | Planned |

**Coverage check:** 52 requirement IDs, each mapped to at least one planned test case range. The master list (`02_Test_Case_Design/Test_Cases.md`) targets ≥ 80 detailed cases.
