# Test Execution Summary

- Run date (latest artefact mtime): 2026-11-22T18:43:46.121Z
- Report generated: 2026-11-22T18:44:17.717Z
- Git commit: 3e225eb (+ uncommitted working-tree changes)
- Environment: Node v24.18.0, Windows_NT 10.0.26300 (win32/x64), PostgreSQL 18 in Docker
- All test data is synthetic.

## Totals (designed test cases)
| Designed | Executed | Pass | Fail | Not executed | Pass rate (of executed) |
|---|---|---|---|---|---|
| 255 | 252 | 252 | 0 | 3 | 100.00% |

## By level
| Level | Designed | Executed | Pass | Fail | Not executed | Pass rate (executed) |
|---|---|---|---|---|---|---|
| End-to-end | 2 | 2 | 2 | 0 | 0 | 100.00% |
| Integration | 115 | 113 | 113 | 0 | 2 | 100.00% |
| Manual | 6 | 5 | 5 | 0 | 1 | 100.00% |
| U/I | 31 | 31 | 31 | 0 | 0 | 100.00% |
| Unit | 101 | 101 | 101 | 0 | 0 | 100.00% |

## By technique
| Technique | Designed | Executed | Pass | Fail | Not executed | Pass rate (executed) |
|---|---|---|---|---|---|---|
| BVA | 77 | 77 | 77 | 0 | 0 | 100.00% |
| DT | 34 | 34 | 34 | 0 | 0 | 100.00% |
| EG | 34 | 33 | 33 | 0 | 1 | 100.00% |
| EP | 88 | 87 | 87 | 0 | 1 | 100.00% |
| ST | 22 | 21 | 21 | 0 | 1 | 100.00% |

## By requirement prefix
| Prefix | Designed | Executed | Pass | Fail | Not executed | Pass rate (executed) |
|---|---|---|---|---|---|---|
| ATT | 23 | 23 | 23 | 0 | 0 | 100.00% |
| AUD | 5 | 5 | 5 | 0 | 0 | 100.00% |
| AUTH | 31 | 31 | 31 | 0 | 0 | 100.00% |
| DASH | 4 | 4 | 4 | 0 | 0 | 100.00% |
| DEPT | 12 | 12 | 12 | 0 | 0 | 100.00% |
| FAC | 28 | 28 | 28 | 0 | 0 | 100.00% |
| HOL | 7 | 7 | 7 | 0 | 0 | 100.00% |
| LEAVE | 42 | 41 | 41 | 0 | 1 | 100.00% |
| NFR | 12 | 11 | 11 | 0 | 1 | 100.00% |
| NOT | 5 | 5 | 5 | 0 | 0 | 100.00% |
| RBAC | 14 | 14 | 14 | 0 | 0 | 100.00% |
| REG | 16 | 15 | 15 | 0 | 1 | 100.00% |
| RPT | 22 | 22 | 22 | 0 | 0 | 100.00% |
| RULE | 34 | 34 | 34 | 0 | 0 | 100.00% |

## Failures
None.

## Not executed
| ID | Level | Reason |
|---|---|---|
| TC-REG-015 | Integration | manual |
| TC-LEAVE-034 | Integration | manual |
| TC-NFR-012 | Manual | manual |

## Raw suite totals (straight from the artefacts)
| Suite | Tests | Failures | Skipped | Duration |
|---|---|---|---|---|
| Jest (JUnit) | 440 | 0 | 0 | 13.53s |
| Playwright (JSON) | 156 | 0 | 36 | 2m 52.5s |

## Coverage (Jest)
Source: apps/api/coverage/lcov.info (lcov has no statement counts; statements shown = lines)

- Lines: 98.25% (1515/1542)
- Statements: 98.25% (1515/1542)
- Functions: 98.47% (321/326)
- Branches: 87.50% (581/664)

## Mutation (Stryker)
89.95% (killed 567, survived 57, no-coverage 7, timeout 6; compile-error 213 excluded from score)

## Data sources and caveats
- JUnit: apps/api/reports/junit/*.xml; Playwright: apps/web/test-results/results.json; coverage: apps/api/coverage/lcov.info; mutation: apps/api/reports/mutation/mutation.json; designed cases: 02_Test_Case_Design/Test_Cases.md.
- **File-level mapping caveat:** Jest test names do not carry TC ids and JUnit has no file attribute. Test files are linked to JUnit suites via their describe() titles, and every TC listing a file gets that file's aggregate result. A PASS therefore means "all tests in the file passed", not that the specific TC was individually asserted.
- Playwright TCs are matched individually by title prefix; if a TC runs in several projects (browsers), all must pass.
