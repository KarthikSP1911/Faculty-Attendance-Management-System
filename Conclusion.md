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
- **Designed test cases:** 255. **Executed:** 255, **passed:** 255, **failed:** 0.
- **Jest:** 440 tests in 21 suites, all passing; coverage 98.25% lines.
- **Playwright:** 164 tests across Chromium, Firefox, WebKit and an iPhone 14 profile: 126 passed, 0 failed, 38 skipped (the TC-NFR-008 viewport sweep runs on Chromium only, and TC-REG-015 skips in the last two projects once the few allowed recent dates are used up; it passed in Chromium and Firefox).
- **Mutation testing (StrykerJS):** 89.95% score on the pure rule files (baseline 86.19% before targeted killer tests).
- **Lighthouse (production build, TC-NFR-012):** landing performance 91-92, login 94-95; accessibility 100, best practices 96, SEO 100 on both.
- **Accessibility:** automated axe scan of the login page and the three dashboards found no serious or critical WCAG 2.1 A/AA violations. This does not replace a manual accessibility review.

## Defects found
Three real defects, each fixed with a regression check: DEF-001 (React duplicate-key error on the faculty dashboard), DEF-002 (admin dashboard tiles linking to a page that does not exist) and DEF-003 (landing page Lighthouse performance 34 against a target of 90, caused by animated SVG filters). The 440 API tests found no product defects. Two test-code problems (DEV-06, DEV-07) are also recorded.

## Limitations
- Per-test-case results for Jest cases are mapped at file level (test names do not carry case IDs), so a failing test would mark every case that points to its file.
- Mutation testing covers only the pure rule files, not routes or UI.
- The check-in/check-out journey depends on the real server clock (07:00–12:00 IST window) and cannot be frozen from the browser.
- Lighthouse audited only the public pages (landing and login); the dashboards need a login. Scores vary by a point or two between runs and the landing page is close to the 90 target (91-92).

## What we learned
- Boundary and decision-table design found the cases that matter most (late cut-off, half-day threshold, token expiry), and mutation testing showed which assertions were too weak (error messages, regex anchors).
- A browser-level run caught problems the API tests could not: a dead link and a rendering warning.
- Isolating test data (separate schema, reseeding before end-to-end runs) removed most flakiness.
