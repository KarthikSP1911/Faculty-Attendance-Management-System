import { defineConfig, devices } from '@playwright/test';

const WEB = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  outputDir: 'test-results/artifacts',
  use: { baseURL: WEB, actionTimeout: 15_000, trace: 'on-first-retry', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  webServer: [
    { command: 'npm run dev --workspace apps/api', cwd: '../..', url: 'http://localhost:4000/api/v1/health', env: { AUTH_RATE_LIMIT: '1000' }, reuseExistingServer: true, timeout: 120_000 },
    { command: 'npm run dev --workspace apps/web', cwd: '../..', url: WEB, reuseExistingServer: true, timeout: 120_000 },
  ],
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'screenshots', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'], testMatch: /screenshots.spec.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'], testMatch: /specs\/.*\.spec\.ts/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'], testMatch: /specs\/.*\.spec\.ts/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'], testMatch: /specs\/.*\.spec\.ts/ },
    { name: 'iphone-14', use: { ...devices['iPhone 14'] }, dependencies: ['setup'], testMatch: /specs\/.*\.spec\.ts/ },
  ],
});
