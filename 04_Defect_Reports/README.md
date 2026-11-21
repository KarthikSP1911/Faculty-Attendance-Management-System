# Defect Reports

All data in this project is synthetic.

## Status: no product defects are evidenced yet

The git history (12 commits) contains only feature and docs commits; no commit is a bug fix, and no test or source comment records a defect. Bugs found and fixed while building a slice were corrected before that slice was committed, so no before/after evidence exists for them. Inventing DEF-001..DEF-008 from nothing would be fabrication, so none are listed.

A defect report is added here only when it has all of: a reproducible failing test or run, a fix commit hash, and a regression test that exists in the repo. Use [DEFECT_TEMPLATE.md](DEFECT_TEMPLATE.md).

Open item for the Jest/Playwright runs: if a full run exposes a real failure (the first full run after step 8 reported failing tests), each root cause that turns out to be a product bug gets a DEF-NNN report with its fix commit and regression test.

## Development issues (tooling, not product defects)

Recorded in the build handoff; none affect product behaviour.

| Ref | Issue | Resolution |
|---|---|---|
| DEV-01 | Jest cannot load pdfkit's ESM-only `fontkit` dependency | `moduleNameMapper` maps `pdfkit` to its standalone CJS bundle (`apps/api/jest.config.js`, `jest.unit.config.js`) |
| DEV-02 | Neon queries are slow (up to ~450 ms each), causing 90 s test timeouts on slow days | Integration `testTimeout` raised to 240 s |
| DEV-03 | Two Jest runs sharing schema `fams_test` truncated each other's tables | `tests/helpers/globalLock.js` queues runs |
| DEV-04 | TypeScript version choice (reason not recorded in the handoff) | TypeScript pinned to ~5.9 |
| DEV-05 | `scarf` install scripts | Kept blocked |
