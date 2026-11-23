// Captures pictures of the generated HTML test reports into 07_Screenshots.
// Run after `npm run reports` (which copies the reports into 06_Test_Reports).
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const jobs = [
  ['06_Test_Reports/jest-coverage/index.html', 'report-jest-coverage.png'],
  ['06_Test_Reports/playwright-report/index.html', 'report-playwright.png'],
  ['06_Test_Reports/mutation/mutation.html', 'report-mutation.png'],
  ['06_Test_Reports/lighthouse/landing.html', 'report-lighthouse-landing.png'],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
for (const [src, out] of jobs) {
  const file = path.join(root, src);
  if (!existsSync(file)) {
    console.log(`skip ${src} (missing)`);
    continue;
  }
  await page.goto(pathToFileURL(file).href);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(root, '07_Screenshots', out) });
  console.log(`wrote 07_Screenshots/${out}`);
}
await browser.close();
