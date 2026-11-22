# Faculty Attendance Management System (FAMS) — Software Testing Portfolio

![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF) ![Jest](https://img.shields.io/badge/tests-Jest%20%2B%20Supertest-C21325) ![E2E](https://img.shields.io/badge/E2E-Playwright-45BA4B) ![Mutation](https://img.shields.io/badge/mutation-StrykerJS-E74C3C) ![Data](https://img.shields.io/badge/data-synthetic-lightgrey)

Badges are static labels; real numbers live in [06 Test Reports](06_Test_Reports).

**Subject:** Software Testing  
**Team:** _Name(s), roll number(s), class, section — to be filled_

## Objectives
Build FAMS (Next.js + Express + Prisma on PostgreSQL (Docker)) and a full testing portfolio around it: test plan, test design techniques (EP, BVA, decision tables, state transition), defect reports, Jest/Supertest, Playwright and StrykerJS mutation testing.

## Setup
1. `docker compose up -d db`, then copy `.env.example` to `apps/api/.env` (defaults match the container) and set the JWT secrets.
2. `npm install`
3. `npm run db:migrate && npm run db:seed`
4. `npm run dev`

## Architecture
```mermaid
flowchart LR
  B[Browser] --> W["apps/web: Next.js 15, port 3000"]
  W -- "/api/v1 rewrite" --> A["apps/api: Express 5 + Prisma, port 4000"]
  A --> DB[(PostgreSQL, Docker)]
  A --> J[Absent job]
  T1[Jest + Supertest] -.-> A
  T2[Playwright] -.-> W
  T3[StrykerJS] -.-> R[attendanceRules and pure rule files]
```

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | API dev server |
| `npm run dev --workspace apps/web` | Web dev server |
| `npm test` | Jest with coverage (API) |
| `npm run test:e2e` | Playwright (needs API and web running or startable) |
| `npm run screenshots` | Screenshots into `07_Screenshots` |
| `npm run test:mutation` | StrykerJS on pure rule files |
| `npm run build` / `lint` / `typecheck` | All workspaces |

See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for a walkthrough.

## Portfolio
| Folder | Contents |
|---|---|
| [01_Test_Plan](01_Test_Plan) | Test plan, assumptions, requirements traceability matrix |
| [02_Test_Case_Design](02_Test_Case_Design) | Equivalence partitioning, BVA, decision tables, state transition, master test case list |
| [03_Test_Execution](03_Test_Execution) | Execution log (actual results per case) and execution summary |
| [04_Defect_Reports](04_Defect_Reports) | Defect reports DEF-001, DEF-002 and tooling issues |
| [05_Test_Automation](05_Test_Automation) | Jest, Supertest, Playwright and StrykerJS setup and mutation results |
| [06_Test_Reports](06_Test_Reports) | Test report summary, coverage, Playwright, mutation and JUnit reports |
| [07_Screenshots](07_Screenshots) | Application and report screenshots |
| [Conclusion.md](Conclusion.md) | Summary, results, limitations, lessons learned |

Regenerate the execution log and reports after a test run: `npm run reports`.

## Demo credentials (synthetic seed data)
| Role | Email | Password |
|---|---|---|
| Admin | `admin@fams.test` | `Demo@1234` |
| HOD (CSE) | `hod.cse@fams.test` | `Demo@1234` |
| Faculty (CSE) | `cse.faculty1@fams.test` | `Demo@1234` |

Seed: 1 admin, 4 departments (CSE, ECE, MECH, CIVIL), 4 HODs, 40 faculty, 90 days of attendance, 7 holidays, leave requests in every state.
