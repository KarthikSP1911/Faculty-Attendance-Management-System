# Decision Tables (DT)

All scenarios use **synthetic demo data**. Logic comes from `computeDailyStatus`, `checkInWindow` / `attendanceService.checkIn`, and `leaveService.assertCanReview`.

## DT-1 Daily status (REQ-RULE-02, 03, 04, 05)

Precedence in code: Holiday, then Weekly Off, then approved full-day leave, then punches.
Check-in class (grace 15): O = on time (<= 09:15), L = late (09:16-10:30), H = after 10:30, N = no check-in.
Hours class: P = >= 7h, HD = 4h to under 7h, A = under 4h, X = no check-out yet.

| Rule | Day type | Leave | Check-in | Hours | Status |
|---|---|---|---|---|---|
| R1 | Holiday | any | any | any | HOLIDAY |
| R2 | Weekly Off (Sunday) | any | any | any | WEEKLY_OFF |
| R3 | Working | Full | any | any | ON_LEAVE |
| R4 | Working | Half | N | - | HALF_DAY |
| R5 | Working | none | N | - | ABSENT |
| R6 | Working | none/Half | O | P | PRESENT |
| R7 | Working | none/Half | L | P | LATE |
| R8 | Working | none/Half | H | P | HALF_DAY |
| R9 | Working | none/Half | O or L or H | HD | HALF_DAY |
| R10 | Working | none/Half | O or L or H | A | ABSENT |
| R11 | Working | none/Half | O or L or H | X, day open | PENDING |
| R12 | Working | none/Half | O or L or H | X, day closed | HALF_DAY |

Notes: a half-day leave with punches is judged on the punches (R6-R12). Holiday beats leave; Weekly Off beats leave.

Example cases (synthetic, shift 09:00, Mon-Sat): R6 in 09:10 out 17:10 (480 min) PRESENT; R7 in 10:00 out 18:00 LATE; R8 in 10:45 out 18:45 HALF_DAY; R9 in 09:00 out 14:00 (300 min) HALF_DAY; R10 in 09:00 out 12:00 (180 min) ABSENT.

## DT-2 Check-in permission (REQ-ATT-01, 02, 03, 04)

Evaluation order in `attendanceService.checkIn`: profile, holiday, weekly off, full leave, already checked in, window.

| Rule | Faculty profile | Holiday | Weekly Off | Full leave | Already checked in | Time in 07:00-12:00 | Outcome |
|---|---|---|---|---|---|---|---|
| C1 | no (e.g. Admin) | - | - | - | - | - | 403 NO_FACULTY_PROFILE |
| C2 | yes | yes | - | - | - | - | 409 HOLIDAY |
| C3 | yes | no | yes | - | - | - | 409 WEEKLY_OFF |
| C4 | yes | no | no | yes | - | - | 409 ON_LEAVE |
| C5 | yes | no | no | no | yes | - | 409 ALREADY_CHECKED_IN |
| C6 | yes | no | no | no | no | before 07:00 | 409 CHECKIN_NOT_OPEN |
| C7 | yes | no | no | no | no | after 12:00 | 409 CHECKIN_CLOSED |
| C8 | yes | no | no | no | no | yes | 201 check-in recorded (server time used) |

A half-day leave does not block check-in (only FULL does).

## DT-3 Leave approval authority (REQ-LEAVE-05, REQ-RBAC-03)

Rule from `assertCanReview`: Admin may review any request; an HOD may review only requests of **another** faculty member in the **same** department; Faculty may never review.

| Rule | Reviewer role | Request in reviewer's department | Request is reviewer's own | Outcome |
|---|---|---|---|---|
| A1 | Faculty | - | - | 403 |
| A2 | HOD | yes | no | allowed |
| A3 | HOD | yes | yes | 403 (cannot approve own leave) |
| A4 | HOD | no | no | 403 |
| A5 | Admin | any | no | allowed |
| A6 | Admin | any | yes | allowed |

Read access (`assertCanView`): Faculty own request; HOD own department; Admin all (403 otherwise).
