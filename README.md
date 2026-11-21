# Faculty Attendance Management System (FAMS) — Software Testing Portfolio

**Subject:** Software Testing  
**Team:** _Name(s), roll number(s), class, section — to be filled_

## Objectives
Build FAMS (Next.js + Express + Prisma on Neon PostgreSQL) and a full testing portfolio around it: test plan, test design techniques (EP, BVA, decision tables, state transition), defect reports, Jest/Supertest, Playwright and StrykerJS mutation testing.

## Setup
1. Copy `.env.example` to `apps/api/.env` and paste your Neon URLs.
2. `npm install`
3. `npm run db:migrate && npm run db:seed`
4. `npm run dev`

_(Full docs, architecture diagram, demo credentials and badges are added as slices land.)_

## Portfolio
[01 Test Plan](01_Test_Plan) · [02 Test Case Design](02_Test_Case_Design) · [03 Execution](03_Test_Execution) · [04 Defects](04_Defect_Reports) · [05 Automation](05_Test_Automation) · [06 Reports](06_Test_Reports) · [07 Screenshots](07_Screenshots)

## Demo credentials (synthetic seed data)
| Role | Email | Password |
|---|---|---|
| Admin | `admin@fams.test` | `Demo@1234` |
| HOD (CSE) | `hod.cse@fams.test` | `Demo@1234` |
| Faculty (CSE) | `cse.faculty1@fams.test` | `Demo@1234` |

Seed: 1 admin, 4 departments (CSE, ECE, MECH, CIVIL), 4 HODs, 40 faculty, 90 days of attendance, 7 holidays, leave requests in every state.
