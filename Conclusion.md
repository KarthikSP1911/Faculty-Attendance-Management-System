# Conclusion

**Application tested:** Faculty Attendance Management System (FAMS), a student-built web application for faculty check-in/check-out, leave, regularization, approvals and reports, with three roles (faculty, head of department, administrator). All data is synthetic. This is not an official service.

**Team:** _Name(s), roll number(s), class, section — to be filled_

## What was done
| Activity | Where |
|---|---|
| Test plan, scope, risks, requirements traceability | [01_Test_Plan](01_Test_Plan) |
| Test case design: equivalence partitioning, boundary value analysis, decision tables, state transition, error guessing (255 cases) | [02_Test_Case_Design](02_Test_Case_Design) |
| Execution with actual results and summary | [03_Test_Execution](03_Test_Execution) |
| Defect reports | [04_Defect_Reports](04_Defect_Reports) |
| Automation: Jest + Supertest, Playwright, StrykerJS mutation testing | [05_Test_Automation](05_Test_Automation) |
| Reports: coverage, Playwright, mutation, JUnit | [06_Test_Reports](06_Test_Reports) |
| Screenshots | [07_Screenshots](07_Screenshots) |

## Results (from the final run, see the execution summary for details)
- **Designed test cases:** 255. **Executed:** 252, **passed:** 252, **failed:** 0. Three were not executed: TC-REG-015 and TC-LEAVE-034 (marked manual) and TC-NFR-012 (Lighthouse run, not performed).
- **Jest:** 440 tests in 21 suites, all passing; coverage 98.25% lines.
- **Playwright:** 156 tests across Chromium, Firefox, WebKit and an iPhone 14 profile: 120 passed, 0 failed, 36 skipped (the TC-NFR-008 viewport sweep runs on Chromium only, so it is skipped in the other three projects).
- **Mutation testing (StrykerJS):** 89.95% score on the pure rule files (baseline 86.19% before targeted killer tests).
- **Accessibility:** automated axe scan of the login page and the three dashboards found no serious or critical WCAG 2.1 A/AA violations. This does not replace a manual accessibility review.

## Defects found
Two real defects, both found while verifying the UI and both fixed with a regression test: DEF-001 (React duplicate-key error on the faculty dashboard) and DEF-002 (admin dashboard tiles linking to a page that does not exist). The 440 API tests found no product defects. Two test-code problems (DEV-06, DEV-07) are also recorded.

## Limitations
- Per-test-case results for Jest cases are mapped at file level (test names do not carry case IDs), so a failing test would mark every case that points to its file.
- Mutation testing covers only the pure rule files, not routes or UI.
- The check-in/check-out journey depends on the real server clock (07:00–12:00 IST window) and cannot be frozen from the browser.
- Lighthouse performance scoring was not run.
- Fix commit hashes for DEF-001 and DEF-002 are placeholders until the changes are committed.

## What we learned
- Boundary and decision-table design found the cases that matter most (late cut-off, half-day threshold, token expiry), and mutation testing showed which assertions were too weak (error messages, regex anchors).
- A browser-level run caught problems the API tests could not: a dead link and a rendering warning.
- Isolating test data (separate schema, reseeding before end-to-end runs) removed most flakiness.
