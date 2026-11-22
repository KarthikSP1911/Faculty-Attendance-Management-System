# Test Report Summary

- Run date (latest artefact mtime): 2026-11-22T18:43:46.121Z
- Report generated: 2026-11-22T18:44:17.717Z
- Git commit: 3e225eb (+ uncommitted working-tree changes)
- Environment: Node v24.18.0, Windows_NT 10.0.26300 (win32/x64), PostgreSQL 18 in Docker
- All test data is synthetic.

## Suites run
| Suite | Tests | Failed | Skipped | Duration |
|---|---|---|---|---|
| Jest unit + integration | 440 | 0 | 0 | 13.53s |
| Playwright E2E (all projects) | 156 | 0 | 36 | 2m 52.5s |

Designed cases: 255; executed 252; pass 252; fail 0; not executed 3; pass rate of executed 100.00% (Jest mapping is file-level, see Test_Execution_Summary.md).

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
