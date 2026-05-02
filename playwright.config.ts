import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  webServer: [
    {
      command: 'npm run dev:web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'dotnet run --project api/src/SolaHub.API/SolaHub.API.csproj --urls http://localhost:5000',
      url: 'http://localhost:5000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Test',
        ConnectionStrings__DefaultConnection:
          process.env.ConnectionStrings__DefaultConnection ??
          'Host=localhost;Port=5432;Database=solahub_test;Username=test;Password=test',
        Jwt__SecretKey:
          process.env.Jwt__SecretKey ?? 'playwright-secret-key-must-be-at-least-32-bytes!!',
        Jwt__Issuer: process.env.Jwt__Issuer ?? 'SolaHub',
        Jwt__Audience: process.env.Jwt__Audience ?? 'SolaHub.Desktop',
      },
    },
  ],
})
