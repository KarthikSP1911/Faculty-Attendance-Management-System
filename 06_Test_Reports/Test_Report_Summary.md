# Test Report Summary

- Run date (latest artefact mtime): 2026-11-22T19:05:18.723Z
- Report generated: 2026-11-23T07:12:28.644Z
- Git commit: 8406b94 (+ uncommitted working-tree changes)
- Environment: Node v24.18.0, Windows_NT 10.0.26300 (win32/x64), PostgreSQL 18 in Docker
- All test data is synthetic.

## Suites run
| Suite | Tests | Failed | Skipped | Duration |
|---|---|---|---|---|
| Jest unit + integration | 440 | 0 | 0 | 14.16s |
| Playwright E2E (all projects) | 164 | 0 | 38 | 2m 52.2s |

Designed cases: 255; executed 255; pass 255; fail 0; not executed 0; pass rate of executed 100.00% (Jest mapping is file-level, see Test_Execution_Summary.md).

## Quality metrics
- Coverage: lines 98.25% (1515/1542), branches 87.50% (581/664), functions 98.47% (321/326), statements 98.25% (1515/1542) (statements = lines, from lcov)
- Mutation score: 89.95% (killed 567, survived 57, no-coverage 7, timeout 6; compile-error 213 excluded from score)

## Thresholds
| Threshold | Required | Actual | Status |
|---|---|---|---|
| Jest coverage lines | >= 85% | 98.25% | MET |
| Jest coverage branches | >= 80% | 87.50% | MET |
| Stryker break | >= 65% | 89.95% | MET |
| Stryker high (target) | >= 85% | 89.95% | MET |
| Stryker low | >= 70% | 89.95% | MET |

## Artefacts
- [Jest coverage](jest-coverage/index.html)
- [Playwright report](playwright-report/index.html)
- [Mutation report](mutation/mutation.html)
- [JUnit junit.xml](junit/junit.xml)
- [Playwright JSON](playwright-results.json)
