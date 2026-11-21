# Boundary Value Analysis (BVA)

All values are **synthetic demo data**. Boundaries are taken from the implementation. Time-of-day values are IST. Default rules: shift start 09:00, grace 15 min, late cut-off 10:30, check-in window 07:00-12:00, check-out closes 23:00, Present >= 420 min, Half Day >= 240 min, late limit 3 per month.

"Today" for date examples: 2026-03-02 (Monday). Columns: min-1 / min / min+1 / max-1 / max / max+1 are shown where the range has two ends; one-sided boundaries show the values either side.

## 1. Check-in time classification (REQ-RULE-02, grace 15)

On time if minute <= 09:00 + grace; Late if <= 10:30; Half Day after.

| Boundary | Check-in | Expected arrival |
|---|---|---|
| on-time upper -1 | 09:14 | ON_TIME |
| on-time upper (max) | 09:15 | ON_TIME |
| late lower (max+1) | 09:16 | LATE |
| late upper -1 | 10:29 | LATE |
| late upper (max) | 10:30 | LATE |
| half-day lower (max+1) | 10:31 | HALF_DAY |

## 2. Check-in window (REQ-ATT-02)

Allowed from 07:00 to 12:00, both inclusive.

| Time | Expected |
|---|---|
| 06:59 (min-1) | rejected, CHECKIN_NOT_OPEN (409) |
| 07:00 (min) | allowed |
| 07:01 (min+1) | allowed |
| 11:59 (max-1) | allowed |
| 12:00 (max) | allowed |
| 12:01 (max+1) | rejected, CHECKIN_CLOSED (409) |

## 3. Check-out time (REQ-ATT-02, REQ-ATT-05)

| Time / condition | Expected |
|---|---|
| 22:59 | allowed (after check-in) |
| 23:00 (max) | allowed |
| 23:01 (max+1) | rejected, CHECKOUT_CLOSED |
| same instant as check-in | rejected, CHECKOUT_BEFORE_CHECKIN |
| check-in + 1 minute | allowed |

## 4. Worked time (REQ-RULE-03)

Minutes are whole minutes between check-in and check-out.

| Worked | Minutes | Hours class |
|---|---|---|
| 3:59 | 239 | ABSENT |
| 4:00 | 240 | HALF_DAY |
| 4:01 | 241 | HALF_DAY |
| 6:59 | 419 | HALF_DAY |
| 7:00 | 420 | PRESENT |
| 7:01 | 421 | PRESENT |

## 5. Grace minutes (REQ-RULE-01)

| Value | Expected |
|---|---|
| -1 (min-1) | 400 "at least 0" |
| 0 (min) | accepted; 09:00 ON_TIME, 09:01 LATE |
| 1 (min+1) | accepted |
| 59 (max-1) | accepted |
| 60 (max) | accepted; 10:00 ON_TIME |
| 61 (max+1) | 400 "at most 60" |

## 6. Password length (REQ-AUTH-06; other classes satisfied)

| Length | Example pattern | Expected |
|---|---|---|
| 7 (min-1) | `Aa1!aaa` | invalid |
| 8 (min) | `Aa1!aaaa` | valid |
| 9 (min+1) | `Aa1!aaaaa` | valid |
| 63 (max-1) | `Aa1!` + 59 x `a` | valid |
| 64 (max) | `Aa1!` + 60 x `a` | valid |
| 65 (max+1) | `Aa1!` + 61 x `a` | invalid |

## 7. Full name length (REQ-FAC-01)

| Length | Example | Expected |
|---|---|---|
| 1 | `A` | 400 |
| 2 | `Jo` | valid |
| 3 | `Joe` | valid |
| 59 | 59 x `A` | valid |
| 60 | 60 x `A` | valid |
| 61 | 61 x `A` | 400 |

## 8. Department name length (REQ-DEPT-01)

| Length | Expected |
|---|---|
| 1 | 400 |
| 2 | valid |
| 3 | valid |
| 49 | valid |
| 50 | valid |
| 51 | 400 |

Department code length (2-6 uppercase letters): `C` invalid, `CS` valid, `CSE` valid, `ABCDE` valid, `ABCDEF` valid, `ABCDEFG` invalid.

## 9. Leave days (REQ-LEAVE-02)

Counted in working days (Mon-Sat, holidays excluded).

| Working days | Example (start 2026-03-09, Monday) | Expected |
|---|---|---|
| 0 (min-1) | Sunday 2026-03-08 only | issue "no working days" |
| 1 (min) | 2026-03-09 to 2026-03-09 | accepted, days = 1 |
| 2 (min+1) | to 2026-03-10 | accepted |
| 14 (max-1) | to 2026-03-24 | accepted |
| 15 (max) | to 2026-03-25 | accepted |
| 16 (max+1) | to 2026-03-26 | issue "at most 15 working days" |

Date window boundaries (today 2026-03-02): start 2026-01-31 (30 days back) accepted, 2026-01-30 (31 days back) rejected; start 2027-03-02 (365 days ahead) accepted, 2027-03-03 (366 ahead) rejected. Balance: days equal to remaining accepted, remaining + 0.5 rejected as INSUFFICIENT_BALANCE.

## 10. Leave and regularization reason length (REQ-LEAVE-02, REQ-REG-01)

Reason is trimmed before counting.

| Length | Expected |
|---|---|
| 9 (min-1) | rejected |
| 10 (min) | accepted |
| 11 (min+1) | accepted |
| 299 (max-1) | accepted |
| 300 (max) | accepted |
| 301 (max+1) | rejected |

## 11. Regularization window and monthly limit (REQ-REG-01, REQ-REG-02)

| Date (today 2026-03-02) | Days back | Expected |
|---|---|---|
| 2026-03-03 | -1 (future) | rejected "cannot be in the future" |
| 2026-03-02 | 0 | accepted |
| 2026-03-01 | 1 | accepted |
| 2026-02-24 | 6 | accepted |
| 2026-02-23 | 7 | accepted |
| 2026-02-22 | 8 | rejected "last 7 days" |

| Earlier requests this month | Expected |
|---|---|
| 0 | accepted |
| 1 | accepted |
| 2 (this is the 3rd request) | accepted |
| 3 (this would be the 4th) | rejected, LIMIT_REACHED / HTTP 409 |

## 12. Attendance percentage and defaulter threshold (REQ-RPT-04, REQ-DASH-03)

Percentage = (Present + Late + 0.5 x Half Day + On Leave - 0.5 x late deductions) / working days x 100, 2 decimals, clamped 0-100. Defaulter if below 75.

| Credit / working days | Percentage | Defaulter? |
|---|---|---|
| 17.5 / 24 | 72.92 | yes |
| 18 / 24 | 75.00 | no (exactly 75) |
| 18.5 / 24 | 77.08 | no |
| 0 working days | 0 | n/a (guard returns 0) |
| credit above working days | 100 (clamped) | no |

## 13. Account lockout (REQ-AUTH-05)

| Consecutive failed logins | Expected state |
|---|---|
| 4 (max-1 of unlocked) | not locked, counter = 4 |
| 5 (boundary) | locked until now + 15 min |
| login while locked (minute 14:59 after lock) | refused as locked |
| at exactly lock expiry (15:00) | not locked (`lockedUntil > now` is false) |
| first failure after expiry | counter restarts at 1 |

## 14. Reset token lifetime (REQ-AUTH-03)

Token expires 30 minutes after creation; usable only strictly before expiry and while unused.

| Time since creation | Expected |
|---|---|
| 29 min 59.999 s | usable |
| 30 min 00.000 s | not usable |
| 30 min 00.001 s | not usable |
| used once, any time | not usable again |
