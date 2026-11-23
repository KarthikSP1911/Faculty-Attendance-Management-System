# Lighthouse (TC-NFR-012)

Run against the production build (`next build` + `next start`) on http://localhost:3000, headless Chromium (Playwright's bundled browser), Lighthouse 12.8.2, default mobile emulation and throttling, 2026-11-23T07:11:44.505Z. Target from the test case: >= 90.

| Page | Performance | Accessibility | Best practices | SEO | Report |
|---|---|---|---|---|---|
| / | 91 | 100 | 96 | 100 | [html](landing.html) |
| /login | 94 | 100 | 96 | 100 | [html](login.html) |

Only public pages were audited: the dashboards need a login, which this runner does not perform.
