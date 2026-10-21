import { defineConfig, devices } from '@playwright/test';

const PORT = 6181;
const isCI = Boolean(process.env['CI']);
/** Timing tests, run on their own (see the perf-* projects). */
const PERF = /frameBudget\.spec\.ts/;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // Two browsers at a time everywhere (owner, 2026-10-21): the dev machine is shared by several
  // game sessions, and Playwright's default (half the cores) starts 6 here. GitHub's runners
  // have 4 cores, where the default was already 2.
  workers: 2,
  forbidOnly: isCI,
  retries: 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: PERF },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: PERF },
    // WebKit is the engine behind Safari and every iPhone and iPad browser.
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: PERF },
    // The frame-time budget (M3.7) is measured on a quiet machine: after every
    // other test, one browser at a time, so other browsers' work isn't timed.
    {
      name: 'perf-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: PERF,
      dependencies: ['chromium', 'firefox', 'webkit'],
    },
    {
      name: 'perf-firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: PERF,
      dependencies: ['perf-chromium'],
    },
    {
      name: 'perf-webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: PERF,
      dependencies: ['perf-firefox'],
    },
  ],
  webServer: {
    // The e2e build is the normal build plus the test hook (src/debug/testHook.ts).
    command: `npm run build:e2e && vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
