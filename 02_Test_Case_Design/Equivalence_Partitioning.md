# Equivalence Partitioning (EP)

All inputs, names, e-mails and dates in this document are **synthetic demo data**. Rules are taken from the implementation (`apps/api/src/services/*Rules.ts`, `passwordPolicy.ts`, `apps/api/src/validators/*.ts`, `apps/api/src/routes/*.ts`). Class IDs (V = valid, I = invalid) are referenced from `Test_Cases.md`.

Reference "today" used in date examples: **2026-03-02** (Monday, IST calendar day).

## 1. Password (REQ-AUTH-06, REQ-AUTH-04, REQ-AUTH-03)

Rule: 8-64 characters, at least one uppercase, one lowercase, one digit, one special (non-alphanumeric) character.

| Class | Description | Example (synthetic) | Expected |
|---|---|---|---|
| EP-PWD-V1 | Valid length and all four character classes | `Demo@1234` | valid |
| EP-PWD-I1 | Shorter than 8 | `Ab@1xyz` (7) | invalid: "at least 8 characters" |
| EP-PWD-I2 | Longer than 64 | `Aa1!` + 61 x `a` (65) | invalid: "at most 64 characters" |
| EP-PWD-I3 | No uppercase | `demo@1234` | invalid: "uppercase letter" |
| EP-PWD-I4 | No lowercase | `DEMO@1234` | invalid: "lowercase letter" |
| EP-PWD-I5 | No digit | `Demo@abcd` | invalid: "digit" |
| EP-PWD-I6 | No special character | `Demo12345` | invalid: "special character" |
| EP-PWD-I7 | Several rules broken at once | `abc` | invalid, multiple errors collected |

## 2. Full name (REQ-FAC-01)

Rule: trimmed, 2-60 characters, letters, spaces and dots only.

| Class | Description | Example | Expected |
|---|---|---|---|
| EP-NAME-V1 | Letters and spaces | `Asha Verma` | valid |
| EP-NAME-V2 | Letters, spaces and dots | `Dr. R. K. Nair` | valid |
| EP-NAME-I1 | Too short (1 char) | `A` | 400 "at least 2 characters" |
| EP-NAME-I2 | Too long (61 chars) | 61 x `A` | 400 "at most 60 characters" |
| EP-NAME-I3 | Contains digit | `Asha2` | 400 "only letters, spaces and dots" |
| EP-NAME-I4 | Contains other symbol | `Asha-Verma` | 400 same message |
| EP-NAME-I5 | Only whitespace (trims to empty) | `"   "` | 400 "at least 2 characters" |

## 3. Phone (REQ-FAC-01)

Rule: exactly 10 digits, first digit 6-9.

| Class | Description | Example | Expected |
|---|---|---|---|
| EP-PH-V1 | 10 digits starting 6-9 | `9876543210` | valid |
| EP-PH-I1 | Starts with 0-5 | `5876543210` | 400 "10 digits starting with 6-9" |
| EP-PH-I2 | 9 digits | `987654321` | 400 |
| EP-PH-I3 | 11 digits | `98765432101` | 400 |
| EP-PH-I4 | Non-digit characters | `98765-4321` | 400 |
| EP-PH-I5 | Includes country code / plus sign | `+919876543210` | 400 |

## 4. Email (REQ-AUTH-01, REQ-FAC-01)

Rule: trimmed, lower-cased, valid e-mail format.

| Class | Description | Example | Expected |
|---|---|---|---|
| EP-EM-V1 | Well-formed address | `asha.verma@demo.test` | valid |
| EP-EM-V2 | Upper-case / padded address (normalised) | `  Asha.Verma@Demo.TEST ` | valid, stored as `asha.verma@demo.test` |
| EP-EM-I1 | Missing `@` | `asha.demo.test` | 400 "Invalid email address" |
| EP-EM-I2 | Missing domain | `asha@` | 400 |
| EP-EM-I3 | Empty string | `""` | 400 |
| EP-EM-I4 | Valid format but already registered (faculty create) | existing e-mail | 409 duplicate |

## 5. Department code and name (REQ-DEPT-01)

| Class | Field | Description | Example | Expected |
|---|---|---|---|---|
| EP-DEPT-V1 | code | 2-6 uppercase letters | `CSE` | valid |
| EP-DEPT-I1 | code | lower-case | `cse` | 400 "2-6 uppercase letters" |
| EP-DEPT-I2 | code | contains digit | `CS1` | 400 |
| EP-DEPT-I3 | code | 1 letter | `C` | 400 |
| EP-DEPT-I4 | code | 7 letters | `ABCDEFG` | 400 |
| EP-DEPT-I5 | code | duplicate of an existing code | `CSE` again | 409 |
| EP-DEPT-V2 | name | 2-50 characters (trimmed) | `Computer Science` | valid |
| EP-DEPT-I6 | name | 1 character | `C` | 400 "at least 2 characters" |
| EP-DEPT-I7 | name | 51 characters | 51 x `D` | 400 "at most 50 characters" |

## 6. Date of joining (REQ-FAC-01)

Rule: valid calendar date `YYYY-MM-DD`, not later than today (IST).

| Class | Description | Example | Expected |
|---|---|---|---|
| EP-DOJ-V1 | Past date | `2020-06-15` | valid |
| EP-DOJ-V2 | Today | `2026-03-02` | valid |
| EP-DOJ-I1 | Future date | `2026-03-03` | 400 "cannot be in the future" |
| EP-DOJ-I2 | Impossible date | `2026-02-30` | 400 "valid YYYY-MM-DD date" |
| EP-DOJ-I3 | Wrong format | `15/06/2020` | 400 |

## 7. Grace minutes (REQ-RULE-01)

Rule: whole number 0-60.

| Class | Description | Example | Expected |
|---|---|---|---|
| EP-GR-V1 | Integer in range | `15` | valid |
| EP-GR-I1 | Negative | `-1` | 400 "at least 0" |
| EP-GR-I2 | Above range | `61` | 400 "at most 60" |
| EP-GR-I3 | Non-integer | `15.5` | 400 "whole number" |
| EP-GR-I4 | Not a number | `"abc"` | 400 |

## 8. Leave days and reason (REQ-LEAVE-02, REQ-LEAVE-03)

| Class | Field | Description | Example (today = 2026-03-02, shift Mon-Sat) | Expected |
|---|---|---|---|---|
| EP-LV-V1 | days | 1-15 working days | 2026-03-09 to 2026-03-11 | days = 3, no issues |
| EP-LV-V2 | days | single half day | 2026-03-09, halfDay FIRST_HALF | days = 0.5 |
| EP-LV-I1 | days | 16 working days | 2026-03-09 to 2026-03-26 (no holidays; 16 Mon-Sat) | issue "at most 15 working days" |
| EP-LV-I2 | days | range with no working day | Sunday only 2026-03-08 | issue "no working days" |
| EP-LV-I3 | days | half day over several days | 2026-03-09 to 2026-03-10, FIRST_HALF | issue "single day" |
| EP-LV-I4 | days | end before start | start 2026-03-10, end 2026-03-09 | issue "cannot be before the start date" |
| EP-LV-I5 | days | spans two calendar years | 2026-12-30 to 2027-01-02 | issue "cannot span two calendar years" |
| EP-LV-I6 | days | overlaps an active request | any dates in an existing Pending/Approved leave | OVERLAP (HTTP 409) |
| EP-LV-I7 | days | exceeds balance | 3 days with 2 remaining | INSUFFICIENT_BALANCE |
| EP-LV-V3 | reason | 10-300 characters (trimmed) | `Family function out of town` | valid |
| EP-LV-I8 | reason | under 10 characters | `Sick` | issue "10-300 characters" |
| EP-LV-I9 | reason | over 300 characters | 301 x `a` | issue "10-300 characters" |

## 9. Regularization reason and date (REQ-REG-01, REQ-REG-02)

| Class | Field | Description | Example (today = 2026-03-02) | Expected |
|---|---|---|---|---|
| EP-RG-V1 | date | today up to 7 days back | `2026-02-23` to `2026-03-02` | valid |
| EP-RG-I1 | date | older than 7 days | `2026-02-22` | issue "last 7 days" |
| EP-RG-I2 | date | future | `2026-03-03` | issue "cannot be in the future" |
| EP-RG-I3 | date | invalid format | `2026-13-01` | issue "valid YYYY-MM-DD" |
| EP-RG-V2 | reason | 10-300 characters | `Biometric device was offline` | valid |
| EP-RG-I4 | reason | under 10 | `Forgot` | issue "10-300 characters" |
| EP-RG-I5 | reason | over 300 | 301 x `a` | issue |
| EP-RG-V3 | times | at least one of in/out, HH:mm, out after in | in `09:10`, out `17:00` | valid |
| EP-RG-I6 | times | neither time given | none | issue "Provide a check-in time..." |
| EP-RG-I7 | times | out not after in | in `17:00`, out `09:00` | issue "after check-in" |
| EP-RG-I8 | times | bad format | `9:5` | issue "must be HH:mm" |
| EP-RG-V4 | monthly count | 0-2 earlier requests this month | requestsThisMonth = 2 | accepted |
| EP-RG-I9 | monthly count | 3 or more | requestsThisMonth = 3 | LIMIT_REACHED (409 REGULARIZATION_LIMIT) |

## 10. Report range (REQ-RPT-01)

Rule: `from`/`to` valid dates, `to >= from`, at most 366 days inclusive; month `YYYY-MM`; format json/csv/pdf.

| Class | Description | Example | Expected |
|---|---|---|---|
| EP-RPT-V1 | Valid range up to 366 days | `2026-03-01` to `2026-03-31` | 200 |
| EP-RPT-V2 | Month in `YYYY-MM` | `2026-03` | 200 |
| EP-RPT-I1 | `to` before `from` | from `2026-03-10`, to `2026-03-09` | 400 "cannot be before the start date" |
| EP-RPT-I2 | Range over 366 days | `2025-01-01` to `2026-01-02` | 400 "cannot exceed 366 days" |
| EP-RPT-I3 | Invalid date | `2026-02-30` | 400 |
| EP-RPT-I4 | Bad month | `2026-13` | 400 "month must be YYYY-MM" |
| EP-RPT-I5 | Unknown export format | `format=xls` | 400 |
| EP-RPT-I6 | Faculty role (not Admin/HOD) | faculty token | 403 |

## 11. pageSize (REQ-FAC-03 and list endpoints)

| Class | Endpoint | Description | Example | Expected |
|---|---|---|---|---|
| EP-PS-V1 | faculty list | one of 10, 25, 50 | `25` | 200, pageSize 25 |
| EP-PS-V2 | faculty list | omitted | none | default 10 |
| EP-PS-I1 | faculty list | other number | `20`, `5`, `100`, `0` | 400 "pageSize must be 10, 25 or 50" |
| EP-PS-I2 | faculty list | non-numeric | `abc` | 400 |
| EP-PS-V3 | leave / regularization lists | integer 1-50 | `50` | 200 |
| EP-PS-I3 | leave / regularization lists | 0 or 51 | `0`, `51` | 400 |
| EP-PS-V4 | notifications / audit lists | integer 1-100 (default 20) | `100` | 200 |
| EP-PS-I4 | notifications / audit lists | 0 or 101 | `101` | 400 |
