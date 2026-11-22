# Test Execution Log

- Run date (latest artefact mtime): 2026-11-22T19:05:18.723Z
- Report generated: 2026-11-22T19:05:56.106Z
- Git commit: 1904947 (+ uncommitted working-tree changes)
- Environment: Node v24.18.0, Windows_NT 10.0.26300 (win32/x64), PostgreSQL 18 in Docker
- All test data is synthetic.

Mapping note: results for Jest-based cases are **file-level** (JUnit carries no test-case IDs); a TC is PASS only if every test in its automated file(s) passed. Playwright cases are matched by TC id at the start of the test title.

| ID | Tech | Level | Automated file | Result | Evidence |
|---|---|---|---|---|---|
| TC-AUTH-001 | EP | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-002 | EP | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-003 | EG | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-004 | EP | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-005 | EP | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-006 | ST | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-007 | ST | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-008 | ST | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-009 | EP | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-010 | ST | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-011 | BVA | U/I | unit/token.test.ts; integration/auth.test.ts | PASS | file-level: 6/6 tests passed in unit/token.test.ts; 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-012 | BVA | U/I | unit/token.test.ts; integration/auth.test.ts | PASS | file-level: 6/6 tests passed in unit/token.test.ts; 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-013 | EG | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-014 | EP | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-015 | EP | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-016 | EG | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-017 | ST | Unit | unit/lockout.test.ts | PASS | file-level: 11/11 tests passed in unit/lockout.test.ts |
| TC-AUTH-018 | BVA | U/I | unit/lockout.test.ts; integration/auth.test.ts | PASS | file-level: 11/11 tests passed in unit/lockout.test.ts; 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-019 | ST | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-020 | BVA | U/I | unit/lockout.test.ts; integration/auth.test.ts | PASS | file-level: 11/11 tests passed in unit/lockout.test.ts; 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-021 | ST | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-AUTH-022 | BVA | Unit | unit/passwordPolicy.test.ts | PASS | file-level: 13/13 tests passed in unit/passwordPolicy.test.ts |
| TC-AUTH-023 | BVA | Unit | unit/passwordPolicy.test.ts | PASS | file-level: 13/13 tests passed in unit/passwordPolicy.test.ts |
| TC-AUTH-024 | BVA | Unit | unit/passwordPolicy.test.ts | PASS | file-level: 13/13 tests passed in unit/passwordPolicy.test.ts |
| TC-AUTH-025 | BVA | Unit | unit/passwordPolicy.test.ts | PASS | file-level: 13/13 tests passed in unit/passwordPolicy.test.ts |
| TC-AUTH-026 | EP | Unit | unit/passwordPolicy.test.ts | PASS | file-level: 13/13 tests passed in unit/passwordPolicy.test.ts |
| TC-AUTH-027 | EP | Unit | unit/passwordPolicy.test.ts | PASS | file-level: 13/13 tests passed in unit/passwordPolicy.test.ts |
| TC-AUTH-028 | EP | Unit | unit/passwordPolicy.test.ts | PASS | file-level: 13/13 tests passed in unit/passwordPolicy.test.ts |
| TC-AUTH-029 | EP | Unit | unit/passwordPolicy.test.ts | PASS | file-level: 13/13 tests passed in unit/passwordPolicy.test.ts |
| TC-AUTH-030 | EP | Unit | unit/passwordPolicy.test.ts | PASS | file-level: 13/13 tests passed in unit/passwordPolicy.test.ts |
| TC-AUTH-031 | EG | Unit | unit/passwordPolicy.test.ts | PASS | file-level: 13/13 tests passed in unit/passwordPolicy.test.ts |
| TC-DEPT-001 | EP | Integration | integration/departments.test.ts | PASS | file-level: 15/15 tests passed in integration/departments.test.ts |
| TC-DEPT-002 | EP | Integration | integration/departments.test.ts | PASS | file-level: 15/15 tests passed in integration/departments.test.ts |
| TC-DEPT-003 | BVA | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-DEPT-004 | BVA | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-DEPT-005 | BVA | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-DEPT-006 | BVA | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-DEPT-007 | EP | Integration | integration/departments.test.ts | PASS | file-level: 15/15 tests passed in integration/departments.test.ts |
| TC-DEPT-008 | EG | Integration | integration/departments.test.ts | PASS | file-level: 15/15 tests passed in integration/departments.test.ts |
| TC-DEPT-009 | EP | Integration | integration/departments.test.ts | PASS | file-level: 15/15 tests passed in integration/departments.test.ts |
| TC-DEPT-010 | EG | Integration | integration/departments.test.ts | PASS | file-level: 15/15 tests passed in integration/departments.test.ts |
| TC-DEPT-011 | EP | Integration | integration/departments.test.ts | PASS | file-level: 15/15 tests passed in integration/departments.test.ts |
| TC-DEPT-012 | EP | Integration | integration/departments.test.ts | PASS | file-level: 15/15 tests passed in integration/departments.test.ts |
| TC-FAC-001 | EP | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-002 | BVA | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-FAC-003 | EP | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-FAC-004 | BVA | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-FAC-005 | EP | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-FAC-006 | BVA | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-FAC-007 | BVA | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-FAC-008 | EP | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-009 | BVA | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-FAC-010 | BVA | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-FAC-011 | EP | Unit | unit/validation.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts |
| TC-FAC-012 | EG | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-013 | EP | Unit | unit/employeeId.test.ts | PASS | file-level: 5/5 tests passed in unit/employeeId.test.ts |
| TC-FAC-014 | EP | U/I | unit/employeeId.test.ts; integration/faculty.test.ts | PASS | file-level: 5/5 tests passed in unit/employeeId.test.ts; 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-015 | BVA | Unit | unit/employeeId.test.ts | PASS | file-level: 5/5 tests passed in unit/employeeId.test.ts |
| TC-FAC-016 | EG | Unit | unit/employeeId.test.ts | PASS | file-level: 5/5 tests passed in unit/employeeId.test.ts |
| TC-FAC-017 | EP | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-018 | EP | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-019 | EP | U/I | unit/validation.test.ts; integration/faculty.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts; 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-020 | EP | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-021 | EG | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-022 | EP | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-023 | EP | Unit | unit/csvImport.test.ts | PASS | file-level: 16/16 tests passed in unit/csvImport.test.ts |
| TC-FAC-024 | EG | U/I | unit/csvImport.test.ts; integration/faculty.test.ts | PASS | file-level: 16/16 tests passed in unit/csvImport.test.ts; 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-025 | EG | Unit | unit/csvImport.test.ts | PASS | file-level: 16/16 tests passed in unit/csvImport.test.ts |
| TC-FAC-026 | BVA | Unit | unit/csvImport.test.ts | PASS | file-level: 16/16 tests passed in unit/csvImport.test.ts |
| TC-FAC-027 | EP | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-FAC-028 | EP | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-RULE-001 | BVA | U/I | unit/validation.test.ts; integration/settings.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts; 13/13 tests passed in integration/settings.test.ts |
| TC-RULE-002 | BVA | U/I | unit/validation.test.ts; integration/settings.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts; 13/13 tests passed in integration/settings.test.ts |
| TC-RULE-003 | BVA | U/I | unit/validation.test.ts; integration/settings.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts; 13/13 tests passed in integration/settings.test.ts |
| TC-RULE-004 | BVA | U/I | unit/validation.test.ts; integration/settings.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts; 13/13 tests passed in integration/settings.test.ts |
| TC-RULE-005 | EP | U/I | unit/validation.test.ts; integration/settings.test.ts | PASS | file-level: 41/41 tests passed in unit/validation.test.ts; 13/13 tests passed in integration/settings.test.ts |
| TC-RULE-006 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-007 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-008 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-009 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-010 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-011 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-012 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-013 | EG | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-014 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-015 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-016 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-017 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-018 | BVA | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-019 | DT | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-020 | DT | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-021 | DT | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-022 | DT | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-023 | DT | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-024 | EG | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-RULE-025 | EG | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-RULE-026 | DT | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-027 | DT | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-028 | DT | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-029 | DT | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-030 | DT | Unit | unit/computeDailyStatus.test.ts | PASS | file-level: 35/35 tests passed in unit/computeDailyStatus.test.ts |
| TC-RULE-031 | BVA | Unit | unit/punchWindow.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts |
| TC-RULE-032 | BVA | Unit | unit/punchWindow.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts |
| TC-RULE-033 | BVA | U/I | unit/punchWindow.test.ts; integration/attendance.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts; 24/24 tests passed in integration/attendance.test.ts |
| TC-RULE-034 | EG | Unit | unit/punchWindow.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts |
| TC-ATT-001 | EP | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-002 | EG | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-003 | EP | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-004 | EG | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-005 | EP | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-006 | BVA | U/I | unit/punchWindow.test.ts; integration/attendance.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts; 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-007 | BVA | Unit | unit/punchWindow.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts |
| TC-ATT-008 | BVA | Unit | unit/punchWindow.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts |
| TC-ATT-009 | BVA | Unit | unit/punchWindow.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts |
| TC-ATT-010 | BVA | U/I | unit/punchWindow.test.ts; integration/attendance.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts; 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-011 | BVA | U/I | unit/punchWindow.test.ts; integration/attendance.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts; 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-012 | BVA | Unit | unit/punchWindow.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts |
| TC-ATT-013 | BVA | U/I | unit/punchWindow.test.ts; integration/attendance.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts; 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-014 | DT | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-015 | DT | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-016 | DT | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-017 | DT | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-018 | DT | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-019 | EG | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-020 | EP | Integration | integration/attendance.test.ts | PASS | file-level: 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-021 | BVA | U/I | unit/punchWindow.test.ts; integration/attendance.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts; 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-022 | EG | U/I | unit/punchWindow.test.ts; integration/attendance.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts; 24/24 tests passed in integration/attendance.test.ts |
| TC-ATT-023 | BVA | Unit | unit/punchWindow.test.ts | PASS | file-level: 22/22 tests passed in unit/punchWindow.test.ts |
| TC-REG-001 | BVA | Unit | unit/regularization.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts |
| TC-REG-002 | BVA | Unit | unit/regularization.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts |
| TC-REG-003 | BVA | U/I | unit/regularization.test.ts; integration/leave.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts; 26/26 tests passed in integration/leave.test.ts |
| TC-REG-004 | BVA | Unit | unit/regularization.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts |
| TC-REG-005 | BVA | Unit | unit/regularization.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts |
| TC-REG-006 | BVA | Unit | unit/regularization.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts |
| TC-REG-007 | BVA | Unit | unit/regularization.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts |
| TC-REG-008 | EP | Unit | unit/regularization.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts |
| TC-REG-009 | BVA | Unit | unit/regularization.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts |
| TC-REG-010 | BVA | U/I | unit/regularization.test.ts; integration/leave.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts; 26/26 tests passed in integration/leave.test.ts |
| TC-REG-011 | EG | Unit | unit/regularization.test.ts | PASS | file-level: 9/9 tests passed in unit/regularization.test.ts |
| TC-REG-012 | ST | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-REG-013 | ST | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-REG-014 | DT | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-REG-015 | ST | Integration | apps/web/e2e/specs/manual-cases.spec.ts | PASS | Playwright: 4/4 test run(s) OK (chromium, firefox, webkit, iphone-14) in apps/web/test-results/results.json |
| TC-REG-016 | EP | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-001 | EP | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-002 | EP | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-003 | EP | U/I | unit/validateLeaveRequest.test.ts; integration/leave.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts; 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-004 | DT | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-005 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-006 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-007 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-008 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-009 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-010 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-011 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-012 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-013 | EP | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-014 | EP | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-015 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-016 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-017 | EP | U/I | unit/validateLeaveRequest.test.ts; integration/leave.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts; 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-018 | BVA | U/I | unit/validateLeaveRequest.test.ts; integration/leave.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts; 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-019 | EP | U/I | unit/validateLeaveRequest.test.ts; integration/leave.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts; 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-020 | EP | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-021 | EP | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-022 | ST | U/I | unit/validateLeaveRequest.test.ts; integration/leave.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts; 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-023 | ST | U/I | unit/validateLeaveRequest.test.ts; integration/leave.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts; 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-024 | ST | U/I | unit/validateLeaveRequest.test.ts; integration/leave.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts; 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-025 | ST | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-026 | ST | U/I | unit/validateLeaveRequest.test.ts; integration/leave.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts; 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-027 | BVA | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-028 | ST | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-029 | ST | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-030 | ST | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-031 | ST | Unit | unit/validateLeaveRequest.test.ts | PASS | file-level: 45/45 tests passed in unit/validateLeaveRequest.test.ts |
| TC-LEAVE-032 | EP | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-033 | ST | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-034 | EG | Integration | apps/web/e2e/specs/manual-cases.spec.ts | PASS | Playwright: 4/4 test run(s) OK (chromium, firefox, webkit, iphone-14) in apps/web/test-results/results.json |
| TC-LEAVE-035 | DT | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-036 | DT | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-037 | DT | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-038 | DT | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-039 | DT | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-040 | ST | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-041 | ST | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-LEAVE-042 | EP | End-to-end | apps/web/e2e/leave.spec.ts (planned) | PASS | Playwright: 4/4 test run(s) OK (chromium, firefox, webkit, iphone-14) in apps/web/test-results/results.json |
| TC-HOL-001 | EP | Integration | integration/settings.test.ts | PASS | file-level: 13/13 tests passed in integration/settings.test.ts |
| TC-HOL-002 | EG | Integration | integration/settings.test.ts | PASS | file-level: 13/13 tests passed in integration/settings.test.ts |
| TC-HOL-003 | EP | Integration | integration/settings.test.ts | PASS | file-level: 13/13 tests passed in integration/settings.test.ts |
| TC-HOL-004 | EP | Integration | integration/settings.test.ts | PASS | file-level: 13/13 tests passed in integration/settings.test.ts |
| TC-HOL-005 | DT | Integration | integration/settings.test.ts | PASS | file-level: 13/13 tests passed in integration/settings.test.ts |
| TC-HOL-006 | EP | End-to-end | apps/web/e2e/holidays.spec.ts (planned) | PASS | Playwright: 12/12 test run(s) OK (chromium, firefox, webkit, iphone-14) in apps/web/test-results/results.json |
| TC-HOL-007 | EP | Integration | integration/settings.test.ts | PASS | file-level: 13/13 tests passed in integration/settings.test.ts |
| TC-DASH-001 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-DASH-004 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-DASH-007 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-DASH-008 | BVA | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-001 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-RPT-002 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-RPT-003 | BVA | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-RPT-004 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-RPT-005 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-RPT-006 | DT | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-RPT-007 | EP | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-008 | EG | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-009 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-RPT-010 | EP | U/I | unit/calculateAttendancePercentage.test.ts; integration/reports.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts; 22/22 tests passed in integration/reports.test.ts |
| TC-RPT-011 | EP | U/I | unit/calculateAttendancePercentage.test.ts; integration/reports.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts; 22/22 tests passed in integration/reports.test.ts |
| TC-RPT-012 | EG | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-013 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-RPT-014 | BVA | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-015 | BVA | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-016 | EP | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-017 | EP | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-018 | BVA | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-019 | BVA | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-020 | EP | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-021 | EP | Unit | unit/calculateAttendancePercentage.test.ts | PASS | file-level: 24/24 tests passed in unit/calculateAttendancePercentage.test.ts |
| TC-RPT-022 | EG | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-NOT-001 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-NOT-002 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-NOT-003 | EG | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-NOT-004 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-NOT-005 | EP | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-AUD-001 | DT | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-AUD-002 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-AUD-003 | EP | Integration | integration/reports.test.ts | PASS | file-level: 22/22 tests passed in integration/reports.test.ts |
| TC-AUD-004 | EP | Integration | integration/leave.test.ts | PASS | file-level: 26/26 tests passed in integration/leave.test.ts |
| TC-AUD-005 | EG | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-001 | EP | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-002 | EG | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-003 | DT | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-004 | DT | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-005 | EG | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-006 | EG | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-007 | DT | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-008 | EG | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-009 | DT | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-010 | DT | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-011 | DT | Integration | integration/faculty.test.ts | PASS | file-level: 31/31 tests passed in integration/faculty.test.ts |
| TC-RBAC-012 | DT | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-013 | DT | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-RBAC-014 | DT | Integration | integration/rbac.test.ts | PASS | file-level: 35/35 tests passed in integration/rbac.test.ts |
| TC-NFR-001 | EG | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-NFR-002 | EG | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-NFR-003 | BVA | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-NFR-004 | EG | Manual | manual | PASS | Playwright: 4/4 test run(s) OK (chromium, firefox, webkit, iphone-14) in apps/web/test-results/results.json |
| TC-NFR-005 | EP | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-NFR-006 | EP | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-NFR-007 | EP | Integration | integration/auth.test.ts | PASS | file-level: 40/40 tests passed in integration/auth.test.ts |
| TC-NFR-008 | EP | Manual | manual | PASS | Playwright: 48/48 test run(s) OK (chromium, firefox, webkit, iphone-14) in apps/web/test-results/results.json |
| TC-NFR-009 | EP | Manual | manual | PASS | Playwright: 8/8 test run(s) OK (chromium, firefox, webkit, iphone-14) in apps/web/test-results/results.json |
| TC-NFR-010 | EP | Manual | manual | PASS | Playwright: 4/4 test run(s) OK (chromium, firefox, webkit, iphone-14) in apps/web/test-results/results.json |
| TC-NFR-011 | EP | Manual | manual | PASS | Playwright: 16/16 test run(s) OK (chromium, firefox, webkit, iphone-14) in apps/web/test-results/results.json |
| TC-NFR-012 | EP | Manual | manual | NOT EXECUTED | manual |
