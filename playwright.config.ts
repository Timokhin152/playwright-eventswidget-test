import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000, // 60 секунд на тест
  expect: {
    timeout: 10000 // 10 секунд на expect
  },
  fullyParallel: false, // false для стабильности
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Один воркер - меньше проблем
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'] // Простой вывод в консоль
  ],
  
  use: {
    baseURL: 'https://dev.3snet.info',
    actionTimeout: 15000, // 15 секунд на действия
    navigationTimeout: 30000, // 30 секунд на навигацию
    trace: 'on-first-retry', // Трейсы только при ретраях
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Только Chrome для стабильности
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      },
    },
  ],
});