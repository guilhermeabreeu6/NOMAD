import { defineConfig, devices } from '@playwright/test';

const VERCEL_URL = 'http://127.0.0.1:4321/';
const STATIC_URL = 'http://127.0.0.1:4322/loja/';

// Os builds (dist-vercel e dist-e2e-static) são gerados por `npm run test:e2e`.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],
  use: { locale: 'pt-BR', trace: 'on-first-retry' },
  webServer: [
    {
      command: 'node scripts/serve-static.mjs --dir dist-vercel --port 4321 --base /',
      url: VERCEL_URL,
      reuseExistingServer: !process.env['CI'],
    },
    {
      command: 'node scripts/serve-static.mjs --dir dist-e2e-static --port 4322 --base /loja/',
      url: STATIC_URL,
      reuseExistingServer: !process.env['CI'],
      env: { SERVE_INDEXABLE: 'true' },
    },
  ],
  projects: [
    { name: 'vercel-mobile', use: { ...devices['Pixel 7'], baseURL: VERCEL_URL }, testIgnore: ['layout.spec.ts'] },
    { name: 'static-mobile', use: { ...devices['Pixel 7'], baseURL: STATIC_URL }, testIgnore: ['layout.spec.ts'] },
    {
      name: 'vercel-desktop',
      use: { ...devices['Desktop Chrome'], baseURL: VERCEL_URL },
      testMatch: ['a11y.spec.ts', 'catalog.spec.ts', 'layout.spec.ts', 'promo-page.spec.ts'],
    },
  ],
});
