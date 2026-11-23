// TC-NFR-012: run Lighthouse on the production build and record scores in 06_Test_Reports/lighthouse.
// Needs the production web app on http://localhost:3000 (`npm run build` then `npx next start` in apps/web).
import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '06_Test_Reports', 'lighthouse');
fs.mkdirSync(out, { recursive: true });
const BASE = process.env.LH_BASE ?? 'http://localhost:3000';
const PAGES = [
  ['landing', '/'],
  ['login', '/login'],
];

const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new'] });
const rows = [];
for (const [name, route] of PAGES) {
  const res = await lighthouse(`${BASE}${route}`, { port: chrome.port, output: ['json', 'html'], logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
  fs.writeFileSync(path.join(out, `${name}.json`), res.report[0]);
  fs.writeFileSync(path.join(out, `${name}.html`), res.report[1]);
  const c = res.lhr.categories;
  rows.push({ name, route, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v.score * 100)])), lhVersion: res.lhr.lighthouseVersion, fetchTime: res.lhr.fetchTime });
}
await chrome.kill();

const md = `# Lighthouse (TC-NFR-012)

Run against the production build (\`next build\` + \`next start\`) on ${BASE}, headless Chromium (Playwright's bundled browser), Lighthouse ${rows[0].lhVersion}, default mobile emulation and throttling, ${rows[0].fetchTime}. Target from the test case: >= 90.

| Page | Performance | Accessibility | Best practices | SEO | Report |
|---|---|---|---|---|---|
${rows.map((r) => `| ${r.route} | ${r.performance} | ${r.accessibility} | ${r['best-practices']} | ${r.seo} | [html](${r.name}.html) |`).join('\n')}

Only public pages were audited: the dashboards need a login, which this runner does not perform.
`;
fs.writeFileSync(path.join(out, 'Lighthouse_Summary.md'), md);
console.log(md);

// Regression gate (DEF-003): every category must stay at or above the target.
const low = rows.filter((r) => [r.performance, r.accessibility, r['best-practices'], r.seo].some((v) => v < 90));
if (low.length) {
  console.error('Lighthouse below target on: ' + low.map((r) => r.route).join(', '));
  process.exitCode = 1;
}
