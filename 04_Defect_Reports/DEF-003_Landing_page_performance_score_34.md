# DEF-003: Landing page scores 34 for Lighthouse performance (target 90)

| Field | Value |
|---|---|
| Severity | Medium |
| Found in | Public landing page (`/`) and login page (`/login`), production build |
| How found | Test case TC-NFR-012 (Lighthouse on the production build), 2026-11-23. First run: landing performance 34, login 75 (accessibility 100, best practices 96, SEO 100 on both) |
| Status | Fixed (commit 2b8f31b) |

## Steps to reproduce
1. `npm run build --workspace apps/web`, then `npx next start -p 3000` in `apps/web`.
2. `npm run lighthouse` (runs `scripts/run-lighthouse.mjs`, Lighthouse 12 with Playwright's Chromium, mobile emulation and throttling).

## Expected
All Lighthouse categories >= 90 (TC-NFR-012).

## Actual
Landing: performance 34, LCP 7.6 s, total blocking time about 12 s, main-thread work 22 s. Login: performance 75, TBT about 1 s.

## Root cause
The hero image is an SVG whose three floating cards were animated while wrapped in SVG blur/drop-shadow filters, and the `<img>` also had a CSS `drop-shadow`. Each animation frame forced the browser to re-render the filters, which dominated main-thread time under the 4x CPU throttle used by Lighthouse. The login page score was also affected by the shared JavaScript bundle on a throttled CPU, and improved once the heavy landing work and the dev-only overhead were gone.

## Fix
- Removed the `filter` from the animated cards and drew the shadow as two static semi-transparent rectangles instead (`apps/web/public/hero-dashboard.svg`).
- Removed `drop-shadow-xl` from the hero `<img>` in `apps/web/src/app/page.tsx`.
- Re-measured: landing 91-92, login 94-95, all other categories unchanged (accessibility 100, best practices 96, SEO 100).

Commit: `2b8f31b` (perf(web): fix landing page Lighthouse score ...)

## Regression test
`npm run lighthouse` (`scripts/run-lighthouse.mjs`) audits `/` and `/login` and exits non-zero if any category drops below 90. Results are in `06_Test_Reports/lighthouse/` and are mapped to TC-NFR-012 in the execution log.

## Note
Scores vary by a point or two between runs, and the landing page margin over 90 is small. The `401` responses to `/api/v1/auth/me` for logged-out visitors appear as console errors in Lighthouse (best practices 96); this is expected behaviour, not a defect.
