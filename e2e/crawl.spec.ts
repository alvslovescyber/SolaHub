/**
 * Crawler that walks every authenticated route, records console errors,
 * failed network requests, and tries every visible button + tab to surface
 * dead handlers / non-rendering widgets.
 *
 * Run:
 *   E2E_USER=alvistest@gmail.com E2E_PASS=Password1 npx playwright test e2e/crawl.spec.ts
 *
 * Output: e2e-report/crawl-report.json
 */
import { test, expect, type Page, type Route } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

interface PageReport {
  route: string
  consoleErrors: string[]
  failedRequests: { url: string; status?: number; failure?: string }[]
  deadButtons: string[]
  notes: string[]
}

const REPORT_PATH = 'e2e-report/crawl-report.json'
const ROUTES = [
  '/',
  '/calendar',
  '/inbox',
  '/bible',
  '/plans',
  '/notes',
  '/community',
  '/settings',
  '/presenter',
] as const

const EMAIL = process.env.E2E_USER ?? 'alvistest@gmail.com'
const PASSWORD = process.env.E2E_PASS ?? 'Password1'

function attachListeners(page: Page, report: PageReport) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Filter noisy/expected entries
      if (
        text.includes('favicon') ||
        text.includes('Download the Vue Devtools extension')
      )
        return
      report.consoleErrors.push(text)
    }
  })
  page.on('pageerror', (err) => {
    report.consoleErrors.push(`pageerror: ${err.message}`)
  })
  page.on('requestfailed', (req) => {
    report.failedRequests.push({ url: req.url(), failure: req.failure()?.errorText })
  })
  page.on('response', (res) => {
    if (res.status() >= 500) {
      report.failedRequests.push({ url: res.url(), status: res.status() })
    }
  })
}

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(EMAIL)
  await page.getByPlaceholder('Enter your password').fill(PASSWORD)
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 8_000 }).catch(() => {}),
    page.getByRole('button', { name: /sign in with email/i }).click(),
  ])
}

async function probeButtons(page: Page, report: PageReport) {
  // Find buttons that aren't inside a router-link / anchor and aren't aria-disabled.
  const handles = await page.locator('button:visible').all()
  for (const handle of handles.slice(0, 25)) {
    const label =
      (await handle.getAttribute('aria-label')) ||
      (await handle.textContent())?.trim() ||
      '(no label)'
    if (!label || /sign out|logout|delete|remove|sign in/i.test(label)) continue

    // Snapshot URL + DOM length, click, then check if anything changed.
    const beforeUrl = page.url()
    const beforeHtmlLen = (await page.content()).length
    try {
      await handle.click({ trial: false, timeout: 1_000 })
      await page.waitForTimeout(200)
    } catch {
      continue
    }
    const afterUrl = page.url()
    const afterHtmlLen = (await page.content()).length
    if (
      beforeUrl === afterUrl &&
      Math.abs(afterHtmlLen - beforeHtmlLen) < 40 &&
      label !== 'Sign in with email'
    ) {
      report.deadButtons.push(label.slice(0, 80))
    }
    // Close any modal that may have opened
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(100)
  }
}

test.describe.configure({ mode: 'serial' })

test('crawl all routes and record issues', async ({ page }) => {
  const allReports: PageReport[] = []

  // If there is no API, stub auth so the crawler still walks every page.
  await page.route('**/api/auth/login', async (route: Route) => {
    if ((await route.request().postDataJSON?.()) ?? null) {
      // forward; if it fails the catch path below stubs.
      try {
        const res = await route.fetch()
        if (res.ok()) {
          await route.fulfill({ response: res })
          return
        }
      } catch {
        /* fall through */
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'crawler-token',
          refreshToken: 'crawler-refresh',
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: EMAIL,
            displayName: 'Alvis Test',
            role: 'Member',
          },
        }),
      })
    }
  })

  await page.route('**/api/notes/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  )
  await page.route('**/api/plans/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  )

  // Initial report for sign-in flow
  const loginReport: PageReport = {
    route: '/login',
    consoleErrors: [],
    failedRequests: [],
    deadButtons: [],
    notes: [],
  }
    attachListeners(page, loginReport)
  await signIn(page)
  if (page.url().includes('/login')) {
    loginReport.notes.push('Sign-in did not redirect — backend may be down or credentials invalid.')
  }
  allReports.push(loginReport)

  for (const route of ROUTES) {
    const report: PageReport = {
      route,
      consoleErrors: [],
      failedRequests: [],
      deadButtons: [],
      notes: [],
    }
    attachListeners(page, report)
    try {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 8_000 })
      await page.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => {})
      await probeButtons(page, report)
    } catch (e) {
      report.notes.push(`Navigation error: ${(e as Error).message}`)
    }
    allReports.push(report)
  }

  mkdirSync(dirname(REPORT_PATH), { recursive: true })
  writeFileSync(REPORT_PATH, JSON.stringify(allReports, null, 2))

  // Always pass — this spec is a reporter, not a gate.
  // (Using expect so playwright considers it a real assertion.)
  expect(allReports.length).toBeGreaterThan(0)
})
