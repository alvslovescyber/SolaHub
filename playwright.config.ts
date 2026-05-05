import { defineConfig, devices } from '@playwright/test'

const webPort = process.env.E2E_WEB_PORT ?? '3000'
const webHost = process.env.E2E_WEB_HOST ?? '127.0.0.1'
const webBaseURL = process.env.E2E_BASE_URL ?? `http://${webHost}:${webPort}`
const webServers = [
  {
    command: `VITE_WEB_ONLY=true vite --host ${webHost} --port ${webPort} --strictPort`,
    url: webBaseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
]

if (process.env.E2E_SKIP_API_SERVER !== 'true') {
  webServers.push({
    command:
      'dotnet run --project api/src/SolaHub.API/SolaHub.API.csproj --urls http://localhost:5000',
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
      Cors__AllowedOrigins: process.env.Cors__AllowedOrigins ?? webBaseURL,
    },
  })
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],

  use: {
    baseURL: webBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  webServer: webServers,
})
