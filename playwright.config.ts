/// <reference types="node" />
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  webServer: [
    {
      command: 'pnpm --filter api dev',
      url: 'http://localhost:4000/api/v1/health',
      name: 'API',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: process.env.PORT ?? '4000',
        FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
        MONGODB_URI:
          process.env.MONGODB_URI_TEST ??
          process.env.MONGODB_URI ??
          'mongodb://127.0.0.1:27017/splitwise_api_test',
        JWT_ACCESS_SECRET:
          process.env.JWT_ACCESS_SECRET ?? 'test-access-secret',
        JWT_REFRESH_SECRET:
          process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret',
      },
    },
    {
      command: 'pnpm --filter web dev',
      url: 'http://localhost:3000/login',
      name: 'Web',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL:
          process.env.NEXT_PUBLIC_API_BASE_URL ??
          'http://localhost:4000/api/v1',
        NEXT_PUBLIC_APP_NAME:
          process.env.NEXT_PUBLIC_APP_NAME ?? 'Splitwise Clone',
      },
    },
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [['list']],
});