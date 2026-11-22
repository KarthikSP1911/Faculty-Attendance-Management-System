# Master Test Case List

All names, e-mails, dates and amounts are **synthetic demo data**. This file lists designed cases only; it contains no execution status or results (see the separate execution log).

Legend. Technique: EP equivalence partitioning, BVA boundary value analysis, DT decision table, ST state transition, EG error guessing. Level: U unit, I integration, E end-to-end, M manual. Priority: H, M, L. In the file column, paths are relative to `apps/api/tests/` unless they start with `apps/web`; "manual" means no automated test is assigned.

Defaults assumed: shift 09:00-17:00 Mon-Sat (Sunday weekly off), grace 15 min, late cut-off 10:30, check-in window 07:00-12:00, check-out until 23:00, Present >= 7 h, Half Day >= 4 h, times in IST. Reference date "today" = 2026-03-02 (Monday).

| ID | Req | Tech | Precondition | Steps | Input | Expected result | Lvl | Pri | Automated file |
|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-001 | REQ-AUTH-01 | EP | Active faculty account exists | POST /auth/login | valid email (mixed case) and correct password | 200, httpOnly cookies set, e-mail normalised | I | H | integration/auth.test.ts |
| TC-AUTH-002 | REQ-AUTH-01 | EP | Active account | POST /auth/login | correct email, wrong password | 401 invalid credentials | I | H | integration/auth.test.ts |
| TC-AUTH-003 | REQ-AUTH-01 | EG | No such user | POST /auth/login | unknown e-mail | 401, same message as wrong password (no user enumeration) | I | H | integration/auth.test.ts |
| TC-AUTH-004 | REQ-AUTH-01 | EP | - | POST /auth/login | malformed e-mail, empty password; also malformed JSON | 400 with field details; 400 for bad JSON | I | M | integration/auth.test.ts |
| TC-AUTH-005 | REQ-AUTH-01 | EP | Logged in | POST /auth/logout, then GET /auth/me | session cookies | 204; /auth/me then 401; logout with no session still 204 | I | M | integration/auth.test.ts |
| TC-AUTH-006 | REQ-AUTH-02 | ST | Logged in, refresh cookie T1 | POST /auth/refresh | T1 | 200, new refresh token T2 issued, T1 revoked | I | H | integration/auth.test.ts |
| TC-AUTH-007 | REQ-AUTH-02 | ST | T1 already rotated to T2 | POST /auth/refresh with old T1 | T1 | 401 TOKEN_REUSED; all sessions of the user revoked (T2 also fails) | I | H | integration/auth.test.ts |
| TC-AUTH-008 | REQ-AUTH-02 | ST | - | POST /auth/refresh | missing, unknown, and expired (> 7 days) token | 401 for each | I | M | integration/auth.test.ts |
| TC-AUTH-009 | REQ-AUTH-03 | EP | - | POST /auth/forgot-password | known and unknown e-mail | identical generic success response; no token for unknown or inactive user | I | M | integration/auth.test.ts |
| TC-AUTH-010 | REQ-AUTH-03 | ST | Reset token issued | POST /auth/reset-password twice | valid token, new password `Demo@1234` | first 200 and new password works; second use rejected | I | H | integration/auth.test.ts |
| TC-AUTH-011 | REQ-AUTH-03 | BVA | Token created at t0 | reset at t0 + 30 min | token | rejected (usable only strictly before expiry); also U: not usable at +30:00.000 and +30:00.001 | U/I | H | unit/token.test.ts; integration/auth.test.ts |
| TC-AUTH-012 | REQ-AUTH-03 | BVA | Token created at t0 | reset at t0 + 29 min | token | accepted; U: usable 1 ms before expiry | U/I | H | unit/token.test.ts; integration/auth.test.ts |
| TC-AUTH-013 | REQ-AUTH-03 | EG | Token T1 issued, then T2 requested | reset with T1 | T1 | rejected (new request invalidates previous token) | I | M | integration/auth.test.ts |
| TC-AUTH-014 | REQ-AUTH-04 | EP | Logged in | POST /auth/change-password | correct current, new `Newer@5678` | 200; session stays valid; new password works | I | H | integration/auth.test.ts |
| TC-AUTH-015 | REQ-AUTH-04 | EP | Logged in | POST /auth/change-password | wrong current password | 422 | I | M | integration/auth.test.ts |
| TC-AUTH-016 | REQ-AUTH-04 | EG | Logged in | POST /auth/change-password | new equals current; and a weak new password | 422 PASSWORD_REUSE; 400 for weak | I | M | integration/auth.test.ts |
| TC-AUTH-017 | REQ-AUTH-05 | ST | Account with 0 failures | 1 wrong login | wrong password | 401, counter = 1, not locked | U | H | unit/lockout.test.ts |
| TC-AUTH-018 | REQ-AUTH-05 | BVA | Account with 4 failures | 5th wrong login | wrong password | locked until now + 15 min | U/I | H | unit/lockout.test.ts; integration/auth.test.ts |
| TC-AUTH-019 | REQ-AUTH-05 | ST | Account locked | login with the correct password | correct password at +14:59 | refused while locked | I | H | integration/auth.test.ts |
| TC-AUTH-020 | REQ-AUTH-05 | BVA | Account locked at t0 | login at t0 + 15 min | correct password | unlocked (`isLocked` false at exact expiry); next failure restarts count at 1 | U/I | H | unit/lockout.test.ts; integration/auth.test.ts |
| TC-AUTH-021 | REQ-AUTH-05 | ST | 3 failures recorded | successful login | correct password | counter reset to 0 | I | M | integration/auth.test.ts |
| TC-AUTH-022 | REQ-AUTH-06 | BVA | - | validatePassword | `Aa1!aaa` (7 chars) | invalid: at least 8 characters | U | H | unit/passwordPolicy.test.ts |
| TC-AUTH-023 | REQ-AUTH-06 | BVA | - | validatePassword | `Aa1!aaaa` (8 chars) | valid | U | H | unit/passwordPolicy.test.ts |
| TC-AUTH-024 | REQ-AUTH-06 | BVA | - | validatePassword | `Aa1!` + 60 x `a` (64 chars) | valid | U | H | unit/passwordPolicy.test.ts |
| TC-AUTH-025 | REQ-AUTH-06 | BVA | - | validatePassword | `Aa1!` + 61 x `a` (65 chars) | invalid: at most 64 characters | U | H | unit/passwordPolicy.test.ts |
| TC-AUTH-026 | REQ-AUTH-06 | EP | - | validatePassword | `demo@1234` | invalid: needs uppercase | U | M | unit/passwordPolicy.test.ts |
| TC-AUTH-027 | REQ-AUTH-06 | EP | - | validatePassword | `DEMO@1234` | invalid: needs lowercase | U | M | unit/passwordPolicy.test.ts |
| TC-AUTH-028 | REQ-AUTH-06 | EP | - | validatePassword | `Demo@abcd` | invalid: needs digit | U | M | unit/passwordPolicy.test.ts |
| TC-AUTH-029 | REQ-AUTH-06 | EP | - | validatePassword | `Demo12345` | invalid: needs special character | U | M | unit/passwordPolicy.test.ts |
| TC-AUTH-030 | REQ-AUTH-06 | EP | - | validatePassword | `Demo@1234` | valid, no errors | U | H | unit/passwordPolicy.test.ts |
| TC-AUTH-031 | REQ-AUTH-06 | EG | - | validatePassword | `abc` | invalid; several errors reported together | U | L | unit/passwordPolicy.test.ts |
| TC-DEPT-001 | REQ-DEPT-01 | EP | Admin logged in | POST /departments | name `Computer Science`, code `CSE` | 201; audit entry written | I | H | integration/departments.test.ts |
| TC-DEPT-002 | REQ-DEPT-01 | EP | Admin | create department | code `cse` | 400 (uppercase letters only) | I | M | integration/departments.test.ts |
| TC-DEPT-003 | REQ-DEPT-01 | BVA | - | validate department | code `C` / `CS` | `C` rejected; `CS` accepted | U | M | unit/validation.test.ts |
| TC-DEPT-004 | REQ-DEPT-01 | BVA | - | validate department | code `ABCDEF` / `ABCDEFG` | 6 accepted; 7 rejected | U | M | unit/validation.test.ts |
| TC-DEPT-005 | REQ-DEPT-01 | BVA | - | validate department | name of 1 char / 2 chars | 1 rejected; 2 accepted | U | M | unit/validation.test.ts |
| TC-DEPT-006 | REQ-DEPT-01 | BVA | - | validate department | name of 50 / 51 chars | 50 accepted; 51 rejected | U | M | unit/validation.test.ts |
| TC-DEPT-007 | REQ-DEPT-01 | EP | Department `CSE` exists | create or update with code `CSE` | duplicate code | 409 on create and on update | I | H | integration/departments.test.ts |
| TC-DEPT-008 | REQ-DEPT-01 | EG | - | update / delete unknown id; HOD or faculty tries to create | unknown id | 404; 403 for non-admin | I | M | integration/departments.test.ts |
| TC-DEPT-009 | REQ-DEPT-02 | EP | Active faculty F1 in CSE | assign F1 as HOD | facultyId of F1 | 200; F1 gets HOD role; previous HOD reverts to faculty | I | H | integration/departments.test.ts |
| TC-DEPT-010 | REQ-DEPT-02 | EG | F1 is HOD of CSE | assign F1 as HOD of ECE; or faculty of another dept / inactive / unknown | those ids | 409 for double HOD; rejected for other-department, inactive, unknown faculty | I | M | integration/departments.test.ts |
| TC-DEPT-011 | REQ-DEPT-03 | EP | CSE has active faculty | DELETE /departments/:id | CSE | 409; also 409 when only inactive faculty remain | I | H | integration/departments.test.ts |
| TC-DEPT-012 | REQ-DEPT-03 | EP | Empty department | DELETE | empty department id | deleted | I | M | integration/departments.test.ts |
| TC-FAC-001 | REQ-FAC-01 | EP | Admin, department exists | POST /faculty | `Asha Verma`, `asha.verma@demo.test`, `9876543210`, past joining date | 201 with generated employee ID, leave balances, temp password (not echoed) | I | H | integration/faculty.test.ts |
| TC-FAC-002 | REQ-FAC-01 | BVA | - | validate name | `A` / `Jo` | `A` rejected; `Jo` accepted | U | M | unit/validation.test.ts |
| TC-FAC-003 | REQ-FAC-01 | EP | - | validate name | `Asha2`, `Asha-Verma` | rejected (letters, spaces, dots only); `Dr. R. K. Nair` accepted | U | M | unit/validation.test.ts |
| TC-FAC-004 | REQ-FAC-01 | BVA | - | validate name | 60 x `A` / 61 x `A` | 60 accepted; 61 rejected | U | M | unit/validation.test.ts |
| TC-FAC-005 | REQ-FAC-01 | EP | - | validate phone | `5876543210` | rejected (must start 6-9) | U | M | unit/validation.test.ts |
| TC-FAC-006 | REQ-FAC-01 | BVA | - | validate phone | `987654321` (9), `98765432101` (11) | both rejected | U | M | unit/validation.test.ts |
| TC-FAC-007 | REQ-FAC-01 | BVA | - | validate phone | `6000000000`, `9999999999` | both accepted | U | L | unit/validation.test.ts |
| TC-FAC-008 | REQ-FAC-01 | EP | Admin | create faculty | e-mail `asha.demo.test` | 400 Invalid email address | I | M | integration/faculty.test.ts |
| TC-FAC-009 | REQ-FAC-01 | BVA | - | validate joining date | today `2026-03-02` | accepted (IST day) | U | M | unit/validation.test.ts |
| TC-FAC-010 | REQ-FAC-01 | BVA | - | validate joining date | tomorrow `2026-03-03` | rejected: cannot be in the future | U | M | unit/validation.test.ts |
| TC-FAC-011 | REQ-FAC-01 | EP | - | validate joining date | `2026-02-30` | rejected: not a valid date | U | L | unit/validation.test.ts |
| TC-FAC-012 | REQ-FAC-01 | EG | Faculty with e-mail exists | create with same e-mail; unknown department or shift | duplicate e-mail | 409; 404 for unknown department/shift | I | H | integration/faculty.test.ts |
| TC-FAC-013 | REQ-FAC-02 | EP | No faculty | nextEmployeeId([]) | empty list | `FAC-0001` | U | H | unit/employeeId.test.ts |
| TC-FAC-014 | REQ-FAC-02 | EP | IDs FAC-0001..FAC-0003 exist | create next faculty twice | - | consecutive IDs (highest + 1) | U/I | H | unit/employeeId.test.ts; integration/faculty.test.ts |
| TC-FAC-015 | REQ-FAC-02 | BVA | Highest ID `FAC-9999` | nextEmployeeId | list with FAC-9999 | `FAC-10000` (pads to 4, grows beyond) | U | L | unit/employeeId.test.ts |
| TC-FAC-016 | REQ-FAC-02 | EG | IDs include malformed values | nextEmployeeId | `['FAC-0002','XYZ','FAC-12']` | malformed ignored; result `FAC-0003` | U | L | unit/employeeId.test.ts |
| TC-FAC-017 | REQ-FAC-03 | EP | 12+ faculty | GET /faculty | no pageSize | 10 items, totals reported | I | M | integration/faculty.test.ts |
| TC-FAC-018 | REQ-FAC-03 | EP | 12+ faculty | GET /faculty?pageSize=25 and 50 | 25, 50 | accepted | I | M | integration/faculty.test.ts |
| TC-FAC-019 | REQ-FAC-03 | EP | - | GET /faculty?pageSize=20 | 20 (also 5, 100) | 400 "pageSize must be 10, 25 or 50" | U/I | M | unit/validation.test.ts; integration/faculty.test.ts |
| TC-FAC-020 | REQ-FAC-03 | EP | Seeded faculty | search by name, employee ID, e-mail; filter department/status; sort asc/desc | q in mixed case | case-insensitive matches; filters and sort applied | I | M | integration/faculty.test.ts |
| TC-FAC-021 | REQ-FAC-03 | EG | HOD logged in | list with another department filter | other departmentId | only HOD's own department returned; faculty role gets 403 | I | H | integration/faculty.test.ts |
| TC-FAC-022 | REQ-FAC-04 | EP | Admin, department `CSE` exists | POST /faculty/import | CSV with valid and invalid rows | valid rows imported; row-level errors listed | I | H | integration/faculty.test.ts |
| TC-FAC-023 | REQ-FAC-04 | EP | - | validateCsvRows | row with bad phone on file line 3 | error reported with row = 3 (header is line 1) | U | M | unit/csvImport.test.ts |
| TC-FAC-024 | REQ-FAC-04 | EG | - | import | empty file, missing column, header only, over 500 rows | 400 for each | U/I | M | unit/csvImport.test.ts; integration/faculty.test.ts |
| TC-FAC-025 | REQ-FAC-04 | EG | - | validateCsvRows | same e-mail twice in one file | second row error "duplicated in this file" | U | M | unit/csvImport.test.ts |
| TC-FAC-026 | REQ-FAC-04 | BVA | - | validateCsvRows | joining date = today | accepted | U | L | unit/csvImport.test.ts |
| TC-FAC-027 | REQ-FAC-05 | EP | Active faculty | deactivate, then login | deactivated account | 403 on login; sessions revoked; attendance history kept | I | H | integration/faculty.test.ts |
| TC-FAC-028 | REQ-FAC-05 | EP | Deactivated faculty | reactivate, then login | - | login succeeds again | I | M | integration/faculty.test.ts |
| TC-RULE-001 | REQ-RULE-01 | BVA | Admin | PUT rules | graceMinutes 0 | accepted | U/I | M | unit/validation.test.ts; integration/settings.test.ts |
| TC-RULE-002 | REQ-RULE-01 | BVA | Admin | PUT rules | graceMinutes 60 | accepted | U/I | M | unit/validation.test.ts; integration/settings.test.ts |
| TC-RULE-003 | REQ-RULE-01 | BVA | Admin | PUT rules | graceMinutes 61 | 400 "at most 60" | U/I | H | unit/validation.test.ts; integration/settings.test.ts |
| TC-RULE-004 | REQ-RULE-01 | BVA | Admin | PUT rules | graceMinutes -1 | 400 "at least 0" | U/I | M | unit/validation.test.ts; integration/settings.test.ts |
| TC-RULE-005 | REQ-RULE-01 | EP | Admin | PUT rules; read default | 15.5; default | 15.5 rejected (whole number); default grace 15 | U/I | M | unit/validation.test.ts; integration/settings.test.ts |
| TC-RULE-006 | REQ-RULE-02 | BVA | Grace 15 | classifyArrival | 09:14 | ON_TIME | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-007 | REQ-RULE-02 | BVA | Grace 15 | classifyArrival | 09:15 | ON_TIME | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-008 | REQ-RULE-02 | BVA | Grace 15 | classifyArrival | 09:16 | LATE | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-009 | REQ-RULE-02 | BVA | Grace 15 | classifyArrival | 10:30 | LATE | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-010 | REQ-RULE-02 | BVA | Grace 15 | classifyArrival | 10:31 | HALF_DAY | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-011 | REQ-RULE-02 | BVA | Grace 0 | classifyArrival | 09:00 and 09:01 | ON_TIME and LATE | U | M | unit/computeDailyStatus.test.ts |
| TC-RULE-012 | REQ-RULE-02 | BVA | Grace 30 | classifyArrival | 09:30 | ON_TIME (follows changed grace) | U | M | unit/computeDailyStatus.test.ts |
| TC-RULE-013 | REQ-RULE-02 | EG | Shift start 10:00 | classifyArrival | 10:15 | ON_TIME (uses the shift start, not fixed 09:00) | U | L | unit/computeDailyStatus.test.ts |
| TC-RULE-014 | REQ-RULE-03 | BVA | In 09:00 | out 12:59 (239 min) | worked 3:59 | ABSENT | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-015 | REQ-RULE-03 | BVA | In 09:00 | out 13:00 (240 min) | worked 4:00 | HALF_DAY | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-016 | REQ-RULE-03 | BVA | In 09:00 | out 15:59 (419 min) | worked 6:59 | HALF_DAY | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-017 | REQ-RULE-03 | BVA | In 09:00 | out 16:00 (420 min) | worked 7:00 | PRESENT | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-018 | REQ-RULE-03 | BVA | In 09:00 | out 16:01 | worked 7:01 | PRESENT | U | M | unit/computeDailyStatus.test.ts |
| TC-RULE-019 | REQ-RULE-02, 03 | DT | - | computeDailyStatus | in 10:00, out 18:00 (480 min) | LATE | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-020 | REQ-RULE-02, 03 | DT | - | computeDailyStatus | in 10:45, out 18:45 | HALF_DAY (after 10:30 even with 7+ h) | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-021 | REQ-RULE-03 | DT | Day still open | computeDailyStatus | in 09:00, no check-out, dayClosed false | PENDING | U | M | unit/computeDailyStatus.test.ts |
| TC-RULE-022 | REQ-RULE-04 | DT | Working day | computeDailyStatus | no punches | ABSENT | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-023 | REQ-RULE-04 | DT | Day closed | computeDailyStatus | in 09:00, no check-out, dayClosed true | HALF_DAY (missed check-out) | U | M | unit/computeDailyStatus.test.ts |
| TC-RULE-024 | REQ-RULE-04 | EG | Admin; past working day, no punches | trigger absent job twice | date in past | absentees, leave days and missed check-outs marked; second run safe (idempotent); future date refused; non-admin refused | I | H | integration/attendance.test.ts |
| TC-RULE-025 | REQ-RULE-04 | EG | Holiday, Sunday, inactive faculty, faculty not yet joined | trigger absent job | those dates/people | nothing marked | I | M | integration/attendance.test.ts |
| TC-RULE-026 | REQ-RULE-05 | DT | - | computeDailyStatus | dayType HOLIDAY | HOLIDAY | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-027 | REQ-RULE-05 | DT | - | computeDailyStatus | dayType WEEKLY_OFF (Sunday) | WEEKLY_OFF | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-028 | REQ-RULE-05 | DT | - | computeDailyStatus | working day, approved full leave | ON_LEAVE | U | H | unit/computeDailyStatus.test.ts |
| TC-RULE-029 | REQ-RULE-05 | DT | - | computeDailyStatus | half-day leave, no punches; and with punches | HALF_DAY; judged on punches | U | M | unit/computeDailyStatus.test.ts |
| TC-RULE-030 | REQ-RULE-05 | DT | - | computeDailyStatus | holiday with leave; Sunday with leave | HOLIDAY; WEEKLY_OFF (day type wins) | U | M | unit/computeDailyStatus.test.ts |
| TC-RULE-031 | REQ-RULE-06 | BVA | Limit 3 | isLateDeduction | previous lates = 0 | false (1st Late) | U | M | unit/punchWindow.test.ts |
| TC-RULE-032 | REQ-RULE-06 | BVA | Limit 3 | isLateDeduction | previous lates = 1 | false (2nd Late) | U | M | unit/punchWindow.test.ts |
| TC-RULE-033 | REQ-RULE-06 | BVA | Limit 3 | isLateDeduction | previous lates = 2, and 5 | true (3rd and 6th Late) | U/I | H | unit/punchWindow.test.ts; integration/attendance.test.ts |
| TC-RULE-034 | REQ-RULE-06 | EG | Limit 0 | isLateDeduction | previous lates = 2 | false (feature disabled) | U | L | unit/punchWindow.test.ts |
| TC-ATT-001 | REQ-ATT-01 | EP | Active faculty, working day, 09:05 IST | POST check-in | no body | 201; record with server time | I | H | integration/attendance.test.ts |
| TC-ATT-002 | REQ-ATT-01 | EG | Already checked in | POST check-in again | - | 409 ALREADY_CHECKED_IN | I | H | integration/attendance.test.ts |
| TC-ATT-003 | REQ-ATT-01 | EP | Checked in 09:00, now 17:00 | POST check-out | - | 200; worked 480 min; status PRESENT | I | H | integration/attendance.test.ts |
| TC-ATT-004 | REQ-ATT-01 | EG | Already checked out | POST check-out again | - | 409 ALREADY_CHECKED_OUT | I | H | integration/attendance.test.ts |
| TC-ATT-005 | REQ-ATT-01 | EP | Not logged in | POST check-in | no token | 401 | I | M | integration/attendance.test.ts |
| TC-ATT-006 | REQ-ATT-02 | BVA | - | checkInWindow | 06:59 | refused CHECKIN_NOT_OPEN | U/I | H | unit/punchWindow.test.ts; integration/attendance.test.ts |
| TC-ATT-007 | REQ-ATT-02 | BVA | - | checkInWindow | 07:00 | allowed | U | H | unit/punchWindow.test.ts |
| TC-ATT-008 | REQ-ATT-02 | BVA | - | checkInWindow | 07:01 | allowed | U | L | unit/punchWindow.test.ts |
| TC-ATT-009 | REQ-ATT-02 | BVA | - | checkInWindow | 11:59 | allowed | U | L | unit/punchWindow.test.ts |
| TC-ATT-010 | REQ-ATT-02 | BVA | - | POST check-in at 12:00 | 12:00 | allowed (inclusive) | U/I | H | unit/punchWindow.test.ts; integration/attendance.test.ts |
| TC-ATT-011 | REQ-ATT-02 | BVA | - | POST check-in at 12:01 | 12:01 | 409 CHECKIN_CLOSED, message suggests regularization | U/I | H | unit/punchWindow.test.ts; integration/attendance.test.ts |
| TC-ATT-012 | REQ-ATT-02 | BVA | Checked in | check-out at 23:00 | 23:00 | allowed | U | H | unit/punchWindow.test.ts |
| TC-ATT-013 | REQ-ATT-02 | BVA | Checked in | check-out at 23:01 | 23:01 | 409 CHECKOUT_CLOSED | U/I | H | unit/punchWindow.test.ts; integration/attendance.test.ts |
| TC-ATT-014 | REQ-ATT-03 | DT | Holiday created for today | POST check-in | - | 409 HOLIDAY, message names the holiday | I | H | integration/attendance.test.ts |
| TC-ATT-015 | REQ-ATT-03 | DT | Today is Sunday | POST check-in | - | 409 WEEKLY_OFF | I | H | integration/attendance.test.ts |
| TC-ATT-016 | REQ-ATT-03 | DT | Today is Saturday, default Mon-Sat shift | POST check-in | - | 201 allowed | I | M | integration/attendance.test.ts |
| TC-ATT-017 | REQ-ATT-03 | DT | Approved full-day leave today | POST check-in | - | 409 ON_LEAVE | I | H | integration/attendance.test.ts |
| TC-ATT-018 | REQ-ATT-03 | DT | Admin account (no faculty profile) | POST check-in | - | 403 NO_FACULTY_PROFILE | I | M | integration/attendance.test.ts |
| TC-ATT-019 | REQ-ATT-04 | EG | Server clock frozen at 09:05 | POST check-in with client time 08:00 in body | forged client time | recorded time is server 09:05 | I | H | integration/attendance.test.ts |
| TC-ATT-020 | REQ-ATT-04 | EP | Checked in | GET /attendance/today; list month | - | open record shown; month list shows own records only | I | M | integration/attendance.test.ts |
| TC-ATT-021 | REQ-ATT-05 | BVA | Checked in at 09:00:00 | check-out at the same minute | same instant | 409 CHECKOUT_BEFORE_CHECKIN | U/I | H | unit/punchWindow.test.ts; integration/attendance.test.ts |
| TC-ATT-022 | REQ-ATT-05 | EG | No check-in today | POST check-out | - | 409 NOT_CHECKED_IN | U/I | H | unit/punchWindow.test.ts; integration/attendance.test.ts |
| TC-ATT-023 | REQ-ATT-05 | BVA | Checked in 09:00 | check-out 1 minute later | 09:01 | allowed | U | M | unit/punchWindow.test.ts |
| TC-REG-001 | REQ-REG-01 | BVA | Today 2026-03-02 | validateRegularization | date 2026-03-02 | accepted | U | H | unit/regularization.test.ts |
| TC-REG-002 | REQ-REG-01 | BVA | Today 2026-03-02 | validateRegularization | date 2026-02-23 (7 days back) | accepted | U | H | unit/regularization.test.ts |
| TC-REG-003 | REQ-REG-01 | BVA | Today 2026-03-02 | validateRegularization | date 2026-02-22 (8 days back) | rejected: last 7 days only | U/I | H | unit/regularization.test.ts; integration/leave.test.ts |
| TC-REG-004 | REQ-REG-01 | BVA | Today 2026-03-02 | validateRegularization | date 2026-03-03; `2026-13-01` | rejected: future / invalid date | U | M | unit/regularization.test.ts |
| TC-REG-005 | REQ-REG-01 | BVA | - | validateRegularization | reason of 9 chars | rejected | U | M | unit/regularization.test.ts |
| TC-REG-006 | REQ-REG-01 | BVA | - | validateRegularization | reason of 10 chars; 300 chars | accepted | U | M | unit/regularization.test.ts |
| TC-REG-007 | REQ-REG-01 | BVA | - | validateRegularization | reason of 301 chars | rejected | U | M | unit/regularization.test.ts |
| TC-REG-008 | REQ-REG-01 | EP | - | validateRegularization | no times; in 17:00 / out 09:00; `9:5` | rejected with field issues for each | U | M | unit/regularization.test.ts |
| TC-REG-009 | REQ-REG-02 | BVA | 2 requests already this month | validateRegularization with count 2 | valid input | accepted (3rd request) | U | H | unit/regularization.test.ts |
| TC-REG-010 | REQ-REG-02 | BVA | 3 requests already this month | validateRegularization with count 3; POST via API | valid input | LIMIT_REACHED; API 409 REGULARIZATION_LIMIT | U/I | H | unit/regularization.test.ts; integration/leave.test.ts |
| TC-REG-011 | REQ-REG-02 | EG | 3 requests this month | validateRegularization with count 3 and bad reason | invalid reason | input error reported, not the limit | U | L | unit/regularization.test.ts |
| TC-REG-012 | REQ-REG-03 | ST | Pending request, HOD of same department | PATCH review APPROVED with comment | `Verified with biometric log` | 200; day status recomputed; faculty notified | I | H | integration/leave.test.ts |
| TC-REG-013 | REQ-REG-03 | ST | Pending request | review REJECTED with comment | - | 200; attendance unchanged | I | H | integration/leave.test.ts |
| TC-REG-014 | REQ-REG-03 | DT | Pending request | review by other-department HOD, faculty, department HOD, admin | roles | other HOD/faculty 403; own-department HOD and admin allowed | I | H | integration/leave.test.ts |
| TC-REG-015 | REQ-REG-03 | ST | Request already APPROVED or REJECTED | review again | any decision | 409 INVALID_TRANSITION "already approved/rejected" | I | M | apps/web/e2e/specs/manual-cases.spec.ts |
| TC-REG-016 | REQ-REG-03 | EP | Approval for a day with no attendance record | approve with in 09:10, out 17:00 | requested times | record created; status recomputed; audit entry for the correction | I | M | integration/leave.test.ts |
| TC-LEAVE-001 | REQ-LEAVE-01 | EP | Authenticated | GET leave types | - | four types listed (CL, SL, EL, On Duty); 401 when unauthenticated | I | M | integration/leave.test.ts |
| TC-LEAVE-002 | REQ-LEAVE-01 | EP | New faculty | read balances | current year | CL 12, SL 10, EL 15 created from quotas | I | H | integration/leave.test.ts |
| TC-LEAVE-003 | REQ-LEAVE-01 | EP | Faculty | apply for On Duty leave | On Duty request of 3 working days | no balance check (unlimited type) | U/I | M | unit/validateLeaveRequest.test.ts; integration/leave.test.ts |
| TC-LEAVE-004 | REQ-LEAVE-01 | DT | Faculty A, faculty B, HOD, admin | read another faculty's balances | roles | allowed only for self, own-department HOD, admin; otherwise 403 | I | M | integration/leave.test.ts |
| TC-LEAVE-005 | REQ-LEAVE-02 | BVA | Mon-Sat shift | validateLeaveRequest | 2026-03-09 to 2026-03-09 | days = 1, no issues | U | H | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-006 | REQ-LEAVE-02 | BVA | Mon-Sat shift, no holidays | validateLeaveRequest | 2026-03-09 to 2026-03-25 (15 working days) | days = 15, no issues | U | H | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-007 | REQ-LEAVE-02 | BVA | same | validateLeaveRequest | 2026-03-09 to 2026-03-26 (16 working days) | issue on endDate: at most 15 working days | U | H | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-008 | REQ-LEAVE-02 | BVA | - | validateLeaveRequest | Sunday 2026-03-08 only | issue: no working days | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-009 | REQ-LEAVE-02 | BVA | Today 2026-03-02 | validateLeaveRequest | start 2026-01-31 (30 days back) | accepted | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-010 | REQ-LEAVE-02 | BVA | Today 2026-03-02 | validateLeaveRequest | start 2026-01-30 (31 days back) | rejected on startDate | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-011 | REQ-LEAVE-02 | BVA | Today 2026-03-02 | validateLeaveRequest | start 2027-03-02 (365 days ahead) | accepted | U | L | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-012 | REQ-LEAVE-02 | BVA | Today 2026-03-02 | validateLeaveRequest | start 2027-03-03 (366 days ahead) | rejected on startDate | U | L | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-013 | REQ-LEAVE-02 | EP | - | validateLeaveRequest | start 2026-03-10, end 2026-03-09; bad date strings | end-before-start issue; invalid-date issues | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-014 | REQ-LEAVE-02 | EP | - | validateLeaveRequest | 2026-12-30 to 2027-01-02 | issue: cannot span two calendar years | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-015 | REQ-LEAVE-02 | BVA | - | validateLeaveRequest | reason of 9 chars | issue on reason | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-016 | REQ-LEAVE-02 | BVA | - | validateLeaveRequest | reason of 10 chars; 300; 301 | 10 and 300 accepted; 301 rejected | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-017 | REQ-LEAVE-02 | EP | Existing Pending/Approved leave covering the dates | POST leave | overlapping dates | OVERLAP / HTTP 409 | U/I | H | unit/validateLeaveRequest.test.ts; integration/leave.test.ts |
| TC-LEAVE-018 | REQ-LEAVE-02 | BVA | CL remaining 2 | validate 2 days; then 2.5 days of request | days = remaining / above | exactly remaining accepted; one more rejected INSUFFICIENT_BALANCE; pending days counted | U/I | H | unit/validateLeaveRequest.test.ts; integration/leave.test.ts |
| TC-LEAVE-019 | REQ-LEAVE-03 | EP | - | validateLeaveRequest | single working day, FIRST_HALF | days = 0.5 | U/I | H | unit/validateLeaveRequest.test.ts; integration/leave.test.ts |
| TC-LEAVE-020 | REQ-LEAVE-03 | EP | - | validateLeaveRequest | 2026-03-09 to 2026-03-10 with SECOND_HALF | issue on halfDay: must be a single day | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-021 | REQ-LEAVE-03 | EP | - | validateLeaveRequest | Sunday 2026-03-08 with FIRST_HALF | issue: not a working day | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-022 | REQ-LEAVE-04 | ST | Draft request | submit | DRAFT -> PENDING | allowed | U/I | H | unit/validateLeaveRequest.test.ts; integration/leave.test.ts |
| TC-LEAVE-023 | REQ-LEAVE-04 | ST | Pending request | approve | PENDING -> APPROVED | allowed | U/I | H | unit/validateLeaveRequest.test.ts; integration/leave.test.ts |
| TC-LEAVE-024 | REQ-LEAVE-04 | ST | Pending request | reject | PENDING -> REJECTED | allowed | U/I | H | unit/validateLeaveRequest.test.ts; integration/leave.test.ts |
| TC-LEAVE-025 | REQ-LEAVE-04 | ST | Pending request | cancel | PENDING -> CANCELLED | allowed | U | H | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-026 | REQ-LEAVE-04 | ST | Approved, start 2026-03-09, today 2026-03-02 | cancel | APPROVED -> CANCELLED | allowed (guard met) | U/I | H | unit/validateLeaveRequest.test.ts; integration/leave.test.ts |
| TC-LEAVE-027 | REQ-LEAVE-04 | BVA | Approved, start = today | cancel | APPROVED -> CANCELLED | refused: "only before it starts" | U | H | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-028 | REQ-LEAVE-04 | ST | Approved leave that has started | cancel via API | PATCH cancel | refused (HTTP 409) | I | H | integration/leave.test.ts |
| TC-LEAVE-029 | REQ-LEAVE-04 | ST | - | canTransitionLeave over the 20 invalid pairs | e.g. DRAFT -> APPROVED, PENDING -> DRAFT, APPROVED -> REJECTED | refused for every pair | U | H | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-030 | REQ-LEAVE-04 | ST | Rejected request | any transition | REJECTED -> PENDING etc. | refused (terminal) | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-031 | REQ-LEAVE-04 | ST | Cancelled request | any transition | CANCELLED -> PENDING etc. | refused (terminal) | U | M | unit/validateLeaveRequest.test.ts |
| TC-LEAVE-032 | REQ-LEAVE-04 | EP | Pending request | reject without comment; reject with comment | empty comment | comment required; with comment the faculty is notified | I | M | integration/leave.test.ts |
| TC-LEAVE-033 | REQ-LEAVE-04 | ST | Faculty | save a draft then submit later | draft payload | draft stored; later submit makes it Pending | I | M | integration/leave.test.ts |
| TC-LEAVE-034 | REQ-LEAVE-04 | EG | Approved leave | approve it again via API | second approval | refused (HTTP 409) | I | M | apps/web/e2e/specs/manual-cases.spec.ts |
| TC-LEAVE-035 | REQ-LEAVE-05 | DT | Pending request | faculty tries to approve; HOD of another department tries | roles | 403 for both | I | H | integration/leave.test.ts |
| TC-LEAVE-036 | REQ-LEAVE-05 | DT | Pending request in CSE; CSE HOD | approve | HOD of same department | 200; balance reduced by the leave days | I | H | integration/leave.test.ts |
| TC-LEAVE-037 | REQ-LEAVE-05 | DT | Pending request in CSE | approve by ECE HOD | other department | 403 | I | H | integration/leave.test.ts |
| TC-LEAVE-038 | REQ-LEAVE-05 | DT | HOD's own pending leave | approve by same HOD | own request | 403 | I | H | integration/leave.test.ts |
| TC-LEAVE-039 | REQ-LEAVE-05 | DT | HOD's own pending leave | approve by admin | admin | 200 | I | M | integration/leave.test.ts |
| TC-LEAVE-040 | REQ-LEAVE-06 | ST | Approved future leave of 2 days, CL balance reduced | cancel | cancel request | CANCELLED; balance restored by 2 days | I | H | integration/leave.test.ts |
| TC-LEAVE-041 | REQ-LEAVE-06 | ST | Approved leave already started | cancel | cancel request | refused; balance unchanged | I | M | integration/leave.test.ts |
| TC-LEAVE-042 | REQ-LEAVE-06 | EP | Faculty and HOD accounts, browser | apply, approve, cancel in the UI and compare balance card | end-to-end flow | balance card matches API after each step | E | M | apps/web/e2e/leave.spec.ts (planned) |
| TC-HOL-001 | REQ-HOL-01 | EP | Admin | POST /holidays | `2026-08-15`, `Independence Day (demo)`, NATIONAL | 201; audit entry | I | M | integration/settings.test.ts |
| TC-HOL-002 | REQ-HOL-01 | EG | Holiday exists on date | create another on same date | duplicate date | 409 | I | M | integration/settings.test.ts |
| TC-HOL-003 | REQ-HOL-01 | EP | Admin | create with invalid date, 1-char name, bad type | invalid input | 400 | I | L | integration/settings.test.ts |
| TC-HOL-004 | REQ-HOL-01 | EP | Admin | update and delete holiday | - | changes applied; audit entries written | I | L | integration/settings.test.ts |
| TC-HOL-005 | REQ-HOL-01 | DT | Faculty, HOD, admin | write as faculty / HOD | holiday write | 403 for non-admin; read allowed for every role | I | M | integration/settings.test.ts |
| TC-HOL-006 | REQ-HOL-02 | EP | Any role logged in | open calendar page | - | all holidays visible | E | L | apps/web/e2e/holidays.spec.ts (planned) |
| TC-HOL-007 | REQ-HOL-02 | EP | Holidays across months | GET /holidays?year=2026&month=3 | year, month | only March 2026 holidays returned | I | L | integration/settings.test.ts |
| TC-DASH-001 | REQ-DASH-01 | EP | Faculty with records | GET faculty dashboard | - | today status, month counts, percentage, balances | I | M | integration/reports.test.ts |
| TC-DASH-004 | REQ-DASH-02 | EP | HOD with department data | GET HOD dashboard | - | department today, pending approvals, 30-day trend | I | M | integration/reports.test.ts |
| TC-DASH-007 | REQ-DASH-03 | EP | Admin | GET admin dashboard | - | KPIs, department comparison, defaulters below 75 % | I | M | integration/reports.test.ts |
| TC-DASH-008 | REQ-DASH-03 | BVA | Faculty at exactly 75.00 % | calculate and list defaulters | 18 of 24 working days | not a defaulter (threshold is below 75) | U | M | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-001 | REQ-RPT-01 | EP | Admin, seeded records | GET /reports/range?from=2026-03-01&to=2026-03-31 | range | counts per faculty; weekly offs and holidays skipped; late deduction applied | I | H | integration/reports.test.ts |
| TC-RPT-002 | REQ-RPT-01 | EP | Admin | range report with departmentId / facultyId filter | filter | only matching faculty | I | M | integration/reports.test.ts |
| TC-RPT-003 | REQ-RPT-01 | BVA | Admin | range report | `to` before `from`; 367-day range (366 allowed); bad date | 400 for each invalid input | I | M | integration/reports.test.ts |
| TC-RPT-004 | REQ-RPT-01 | EP | Admin | GET /reports/daily?date=2026-03-02 | date | every faculty with status and punches | I | M | integration/reports.test.ts |
| TC-RPT-005 | REQ-RPT-01 | EP | Admin | GET /reports/monthly?month=2026-03; month `2026-13` | month | whole month; bad month 400 | I | M | integration/reports.test.ts |
| TC-RPT-006 | REQ-RPT-01 | DT | HOD; faculty | HOD requests other department; faculty requests report | roles | HOD limited to own department; faculty 403 | I | H | integration/reports.test.ts |
| TC-RPT-007 | REQ-RPT-02 | EP | - | musterCode for each status | PRESENT, LATE, HALF_DAY, ABSENT, ON_LEAVE, HOLIDAY, WEEKLY_OFF | P, L, HD, A, OL, H, WO | U | H | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-008 | REQ-RPT-02 | EG | - | musterCode PENDING | PENDING | P | U | L | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-009 | REQ-RPT-02 | EP | Admin | GET muster for 2026-03 | month | one code for each day of the month | I | M | integration/reports.test.ts |
| TC-RPT-010 | REQ-RPT-03 | EP | Admin | range report with format=csv | csv | CSV with attachment filename, CRLF line endings | U/I | M | unit/calculateAttendancePercentage.test.ts; integration/reports.test.ts |
| TC-RPT-011 | REQ-RPT-03 | EP | Admin | range report with format=pdf | pdf | PDF returned (also across several pages) | U/I | M | unit/calculateAttendancePercentage.test.ts; integration/reports.test.ts |
| TC-RPT-012 | REQ-RPT-03 | EG | - | csvCell | `=SUM(A1)`, `-5`, `a,b` | formula cell prefixed with `'`; plain negative number kept; comma value quoted | U | H | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-013 | REQ-RPT-03 | EP | Admin | format=xls | xls | 400 | I | L | integration/reports.test.ts |
| TC-RPT-014 | REQ-RPT-04 | BVA | - | calculateAttendancePercentage | 24 present of 24 working days | 100 | U | H | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-015 | REQ-RPT-04 | BVA | - | calculateAttendancePercentage | credit 18 of 24 | 75 | U | H | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-016 | REQ-RPT-04 | EP | - | calculateAttendancePercentage | present 20, half day 2, on leave 1 of 24 | 91.67 (22/24) | U | H | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-017 | REQ-RPT-04 | EP | - | calculateAttendancePercentage | present 10, late deduction 1 of 10 working days | 95 (0.5 day off) | U | M | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-018 | REQ-RPT-04 | BVA | - | calculateAttendancePercentage | working days = 0 | 0 | U | M | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-019 | REQ-RPT-04 | BVA | - | calculateAttendancePercentage | credit above working days; negative credit | clamped to 100; clamped to 0 | U | M | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-020 | REQ-RPT-04 | EP | - | calculateAttendancePercentage | present 1 of 3 working days | 33.33 (2 decimals) | U | M | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-021 | REQ-RPT-04 | EP | - | calculateAttendancePercentage | on leave 2 of 4 days | 50 (leave counts as credit) | U | L | unit/calculateAttendancePercentage.test.ts |
| TC-RPT-022 | REQ-RPT-04 | EG | Faculty joined mid-month | range report | dates before joining | days before joining are not counted as working days | I | M | integration/reports.test.ts |
| TC-NOT-001 | REQ-NOT-01 | EP | User with notifications | GET /notifications | - | only own notifications and unread count | I | M | integration/reports.test.ts |
| TC-NOT-002 | REQ-NOT-01 | EP | Unread notification | mark one read | id | marked read | I | L | integration/reports.test.ts |
| TC-NOT-003 | REQ-NOT-01 | EG | Another user's notification | mark it read | foreign id | refused (cannot touch someone else's) | I | M | integration/reports.test.ts |
| TC-NOT-004 | REQ-NOT-01 | EP | Several unread | mark all read | - | unread count 0 | I | L | integration/reports.test.ts |
| TC-NOT-005 | REQ-NOT-01 | EP | Pending leave | HOD rejects with comment | decision | faculty receives a notification | I | M | integration/leave.test.ts |
| TC-AUD-001 | REQ-AUD-01 | DT | Faculty, HOD, admin | GET /audit | roles | admin only; others 403 | I | H | integration/reports.test.ts |
| TC-AUD-002 | REQ-AUD-01 | EP | Admin made changes | GET /audit | - | entries show actor, entity, old/new values | I | M | integration/reports.test.ts |
| TC-AUD-003 | REQ-AUD-01 | EP | Admin | filter audit by entity | entity=Department | only matching entries | I | L | integration/reports.test.ts |
| TC-AUD-004 | REQ-AUD-01 | EP | Admin | approve leave; approve regularization | - | audit entries for approval and for the attendance correction | I | M | integration/leave.test.ts |
| TC-AUD-005 | REQ-AUD-01 | EG | Non-admin | attempt a denied admin call | forbidden request | 403 and no audit entry; data unchanged | I | M | integration/rbac.test.ts |
| TC-RBAC-001 | REQ-RBAC-01 | EP | No token | call each admin-only endpoint | none | 401 | I | H | integration/rbac.test.ts |
| TC-RBAC-002 | REQ-RBAC-01 | EG | - | call with tampered or expired access token | altered JWT | 401 | I | H | integration/rbac.test.ts |
| TC-RBAC-003 | REQ-RBAC-01 | DT | Faculty token | call each admin-only endpoint | faculty | 403 | I | H | integration/rbac.test.ts |
| TC-RBAC-004 | REQ-RBAC-01 | DT | HOD token | call each admin-only endpoint | HOD | 403 | I | H | integration/rbac.test.ts |
| TC-RBAC-005 | REQ-RBAC-01 | EG | HOD demoted to faculty | next request to an HOD-only list | same token | refused on the very next request | I | M | integration/rbac.test.ts |
| TC-RBAC-006 | REQ-RBAC-01 | EG | Deactivated user with a still-valid token | any request | token | refused | I | H | integration/rbac.test.ts |
| TC-RBAC-007 | REQ-RBAC-01 | DT | Admin token | call each admin-only endpoint | admin | allowed | I | M | integration/rbac.test.ts |
| TC-RBAC-008 | REQ-RBAC-01 | EG | Faculty token | denied admin call | forbidden request | data unchanged | I | M | integration/rbac.test.ts |
| TC-RBAC-009 | REQ-RBAC-02 | DT | Two faculty in the same department | GET colleague record | colleague id | 403 | I | H | integration/rbac.test.ts |
| TC-RBAC-010 | REQ-RBAC-02 | DT | Faculty in another department | GET that record | other-department id | 403 | I | H | integration/rbac.test.ts |
| TC-RBAC-011 | REQ-RBAC-02 | DT | Faculty | GET own record | own id | 200 | I | M | integration/faculty.test.ts |
| TC-RBAC-012 | REQ-RBAC-03 | DT | HOD of CSE | GET CSE faculty | own department | 200 | I | H | integration/rbac.test.ts |
| TC-RBAC-013 | REQ-RBAC-03 | DT | HOD of CSE | GET ECE faculty | other department | 403 | I | H | integration/rbac.test.ts |
| TC-RBAC-014 | REQ-RBAC-03 | DT | HOD of CSE | list faculty, with and without filter | filter for ECE | list shows only CSE | I | M | integration/rbac.test.ts |
| TC-NFR-001 | REQ-NFR-01 | EG | Server running | request from the configured CORS origin | allowed origin | allowed | I | M | integration/auth.test.ts |
| TC-NFR-002 | REQ-NFR-01 | EG | Server running | request from a different origin | other origin | not allowed | I | M | integration/auth.test.ts |
| TC-NFR-003 | REQ-NFR-01 | BVA | Server running | send repeated requests to /auth/* from one IP within a minute | more than 10 | 429 | I | H | integration/auth.test.ts |
| TC-NFR-004 | REQ-NFR-01 | EG | Server running | inspect response headers of any endpoint | - | helmet security headers present | M | M | manual |
| TC-NFR-005 | REQ-NFR-02 | EP | Server running | GET /health | - | envelope `{success,data,error}` and request id | I | M | integration/auth.test.ts |
| TC-NFR-006 | REQ-NFR-02 | EP | Server running | GET unknown route | - | 404 envelope | I | L | integration/auth.test.ts |
| TC-NFR-007 | REQ-NFR-02 | EP | - | send invalid body to any validated endpoint | invalid fields | 400 with field-level details | I | M | integration/auth.test.ts |
| TC-NFR-008 | REQ-NFR-03 | EP | Web app running | view at 375, 768, 1440 px widths | viewport sizes | layout usable without horizontal scroll | M | M | manual |
| TC-NFR-009 | REQ-NFR-03 | EP | Web app running | toggle dark mode | theme toggle | all pages readable | M | L | manual |
| TC-NFR-010 | REQ-NFR-03 | EP | Web app running | navigate login and check-in with keyboard only | Tab/Enter | all controls reachable, visible focus | M | M | manual |
| TC-NFR-011 | REQ-NFR-03 | EP | Web app running | run an accessibility checker on key pages | - | no WCAG 2.1 AA violations reported | M | M | manual |
| TC-NFR-012 | REQ-NFR-04 | EP | Web app built | run Lighthouse | production build | scores recorded in the test report folder; target >= 90 | M | M | manual |
