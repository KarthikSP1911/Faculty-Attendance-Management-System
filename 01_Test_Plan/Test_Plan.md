# Test Plan — Faculty Attendance Management System (FAMS)

Structure follows IEEE 829-2008 (Test Plan).

## 1. Test Plan Identifier
`FAMS-TP-001`, version 1.0, status: Approved for execution. Owner: QA lead (team members listed in the root README).

## 2. Introduction
FAMS lets Admin, HOD and Faculty users manage faculty attendance, leave, regularization, holidays, reports and audit trails. This plan defines how the system is verified. It is written **before** the implementation (testing-first): every requirement has an ID, and every test case traces back to one (see `Requirements_Traceability_Matrix.md`).

Objectives:
1. Verify the exact business rules (status computation, attendance %, leave state machine, lockout).
2. Prove role-based access control is enforced on the backend.
3. Reach the quality gates in section 8 (coverage, mutation score, zero open Critical/High defects).

## 3. Test Items
| Item | Version | Location |
|---|---|---|
| REST API (Express 5, Prisma, PostgreSQL in Docker) | build SHA recorded in execution log | `apps/api` |
| Web application (Next.js 15) | build SHA recorded in execution log | `apps/web` |
| Pure business-logic services | same | `apps/api/src/services`, `apps/api/src/utils` |

## 4. Features to Be Tested
| Module | Feature | Requirement IDs |
|---|---|---|
| M1 | Authentication and account | REQ-AUTH-01 … REQ-AUTH-06 |
| M2 | Department management | REQ-DEPT-01 … REQ-DEPT-03 |
| M3 | Faculty management | REQ-FAC-01 … REQ-FAC-05 |
| M4 | Shift and attendance rules | REQ-RULE-01 … REQ-RULE-06 |
| M5 | Check-in / check-out | REQ-ATT-01 … REQ-ATT-05 |
| M6 | Regularization | REQ-REG-01 … REQ-REG-03 |
| M7 | Leave management | REQ-LEAVE-01 … REQ-LEAVE-06 |
| M8 | Holiday calendar | REQ-HOL-01, REQ-HOL-02 |
| M9 | Dashboards | REQ-DASH-01 … REQ-DASH-03 |
| M10 | Reports and export | REQ-RPT-01 … REQ-RPT-04 |
| M11 | Notifications and audit | REQ-NOT-01, REQ-AUD-01 |
| Cross-cutting | Access control | REQ-RBAC-01 … REQ-RBAC-03 |
| Cross-cutting | Non-functional | REQ-NFR-01 … REQ-NFR-04 |

Full requirement wording is in the traceability matrix.

## 5. Features Not to Be Tested
- Docker, Vercel/GitHub infrastructure internals and third-party library internals (Prisma, Next.js).
- Email delivery (reset links are logged to the console in development).
- Real biometric or GPS check-in (not part of scope).
- Load and stress testing beyond a smoke check of the auth rate limiter.
- Languages other than English; browsers older than the last two major versions.

## 6. Approach
| Level | Technique and tool |
|---|---|
| Unit | Jest, pure service functions with an injectable clock (frozen time). Designs from EP, BVA, decision tables, state transition (`02_Test_Case_Design/`). |
| Integration | Jest + Supertest against a separate **test** schema (`fams_test`), run `--runInBand`, tables truncated between suites. Each endpoint: happy path, 400, 401, 403, 404, 409. |
| End-to-end | Playwright (Chromium, Firefox, WebKit, iPhone 14), Page Object Model, role `storageState` fixtures. |
| Mutation | StrykerJS on `src/services/**` and `src/utils/**` using the unit config; score recorded before and after improvement. |
| Manual / exploratory | UI layout in light and dark mode, accessibility spot checks (keyboard, contrast), Lighthouse. |
| Regression | Every fixed defect keeps a regression test; the whole suite runs in CI on each push. |
| Static | ESLint, TypeScript strict typecheck. |

Test data: seeded synthetic data (1 admin, 4 departments, 4 HODs, 40 faculty, 3 months of attendance). All people and values are fictitious.

## 7. Item Pass / Fail Criteria
- A test case passes when actual result equals expected result, including HTTP status code, response envelope and persisted state.
- A build passes when: all automated tests pass, no Critical or High defect is open, lint and typecheck are clean.

## 8. Exit / Quality Gates
| Gate | Threshold |
|---|---|
| Backend line coverage | ≥ 85 % |
| Backend branch coverage | ≥ 80 % |
| Mutation score (business logic) | ≥ 70 % target, build fails below 65 % |
| Planned test cases executed | 100 % |
| Test case pass rate | ≥ 95 % (remaining items have an accepted defect) |
| Open Critical / High defects | 0 |
| Every requirement ID has ≥ 1 test case | 100 % |
| Lighthouse (Performance, Accessibility, Best Practices) | ≥ 90 |

## 9. Suspension and Resumption Criteria
Suspend testing when: the test database is unreachable; the build fails to start; a Critical defect blocks more than 30 % of remaining cases; seed data is corrupted.
Resume when: the blocker is fixed and a smoke test (login, check-in, apply leave) passes; the test database is reset and re-seeded.

## 10. Test Deliverables
Test plan, traceability matrix, test case design documents, master test case list, execution log, defect reports and summary, automation scripts, coverage / mutation / Playwright / JUnit reports, screenshots, execution summary, conclusion.

## 11. Testing Tasks
Define requirement IDs → design test cases → write unit tests → write integration tests → write E2E tests → run mutation tests and kill survivors → execute and log → report defects → retest and regress → write summary.

## 12. Environment
| Item | Setting |
|---|---|
| OS | Windows 11 (local), Ubuntu latest (GitHub Actions) |
| Runtime | Node.js 20+, npm workspaces |
| Database | PostgreSQL 18 in Docker, separate `fams_test` schema; tests abort if `TEST_DATABASE_URL` is missing or equals `DATABASE_URL` |
| Browsers | Chromium, Firefox, WebKit, mobile emulation (iPhone 14) |
| Time | Injectable `clock.now()`; server time is the source of truth |
| Secrets | Local `.env` and GitHub Actions secrets, never committed |

## 13. Responsibilities
| Role | Responsibility |
|---|---|
| QA lead | Plan, case design, review, summary report |
| Test engineers | Unit / integration / E2E scripts, execution, defect reports |
| Developer | Defect fixing, regression tests |
| Reviewer / faculty guide | Approval of plan and final report |

## 14. Schedule
Follows the build order. Each milestone ends with a commit.

| # | Milestone | Exit evidence |
|---|---|---|
| 1 | Scaffold, Docker Postgres connection, CI skeleton | green install and lint |
| 2 | Test plan and requirement IDs | this document |
| 3 | Schema, migrations, seed | seed runs on test DB |
| 4–8 | API modules with unit + integration tests | coverage thresholds |
| 9–10 | Frontend design system and pages | manual review |
| 11 | Playwright suite and screenshots | E2E green in 4 projects |
| 12 | Mutation testing | score ≥ 70 % |
| 13 | Design docs, execution log, defects | all folders populated |
| 14 | Accessibility, Lighthouse, polish | gates in section 8 met |

## 15. Risks and Mitigation
| Risk | Impact | Mitigation |
|---|---|---|
| Time-dependent rules (09:15, 10:30, nightly job) are flaky | High | Injectable clock; boundary tests at exact minutes; use a fixed IANA time zone (Asia/Kolkata) in all date logic |
| Shared test schema causes contention | Medium | `--runInBand`, truncate between suites |
| Test DB equals main DB, data loss | High | Startup guard aborts the run |
| Mutation run is slow | Medium | Unit config only, `--incremental`, separate CI job |
| Cross-browser E2E flakiness | Medium | Web-first assertions, traces on failure, one retry in CI |
| Secrets leak into git | High | `.env` ignored; CI secrets; review before each commit |

## 16. Approvals
| Name | Role | Signature | Date |
|---|---|---|---|
| _to be filled_ | QA lead | | |
| _to be filled_ | Faculty guide | | |
