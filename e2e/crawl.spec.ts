/**
 * Crawler that walks every authenticated route, records console errors,
 * failed network requests, and probes safe visible controls to surface dead
 * handlers / non-rendering widgets.
 *
 * Run:
 *   npx playwright test e2e/crawl.spec.ts
 *
 * Output: e2e-report/crawl-report.json
 */
import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { mockAuthenticatedSession, mockStableAppApi, stubBibleApi } from './support/auth'

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

function attachListeners(page: Page, getReport: () => PageReport | null) {
  page.on('console', (msg) => {
    const report = getReport()
    if (!report) return
    if (msg.type() === 'error') {
      const text = msg.text()
      // Filter noisy/expected entries
      if (text.includes('favicon') || text.includes('Download the Vue Devtools extension')) return
      report.consoleErrors.push(text)
    }
  })
  page.on('pageerror', (err) => {
    const report = getReport()
    if (!report) return
    report.consoleErrors.push(`pageerror: ${err.message}`)
  })
  page.on('requestfailed', (req) => {
    const report = getReport()
    if (!report) return
    report.failedRequests.push({ url: req.url(), failure: req.failure()?.errorText })
  })
  page.on('response', (res) => {
    const report = getReport()
    if (!report) return
    if (res.status() >= 500) {
      report.failedRequests.push({ url: res.url(), status: res.status() })
    }
  })
}

async function gotoHashRoute(page: Page, route: string) {
  await page.goto(`/#${route}`, { waitUntil: 'domcontentloaded', timeout: 8_000 })
  await page.waitForLoadState('networkidle', { timeout: 2_000 }).catch(() => {})
}

function shouldProbeButton(label: string) {
  if (!label || label === '(no label)') return false

  return !/sign out|logout|delete|remove|present|display|open|load|new|create|add|save|publish|archive|mark|next|previous|blank|edit|queue|import|upload|download|close/i.test(
    label
  )
}

async function probeButtons(page: Page, report: PageReport) {
  // Find buttons that aren't inside a router-link / anchor and aren't aria-disabled.
  const handles = await page.locator('button:visible').all()
  for (const handle of handles.slice(0, 8)) {
    const label =
      (await handle.getAttribute('aria-label')) ||
      (await handle.textContent())?.trim() ||
      '(no label)'
    if (!shouldProbeButton(label)) continue

    // Snapshot URL + DOM length, click, then check if anything changed.
    const beforeUrl = page.url()
    const beforeHtmlLen = (await page.content()).length
    try {
      await handle.click({ trial: false, timeout: 500 })
      await page.waitForTimeout(100)
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
    await page.waitForTimeout(50)
  }
}

test.describe.configure({ mode: 'serial' })

test('crawl all routes and record issues', async ({ page }) => {
  test.setTimeout(60_000)
  const allReports: PageReport[] = []
  let activeReport: PageReport | null = null
  attachListeners(page, () => activeReport)

  await mockAuthenticatedSession(page, { role: 'Pastor' })
  await mockStableAppApi(page)
  await stubBibleApi(page)

  await page.route('**/api/notes**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  )
  await page.route('**/api/plans**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  )
  await page.route('**/api/community**', (route) =>
    route.fulfill({
      status: route.request().method() === 'GET' ? 200 : 204,
      contentType: 'application/json',
      body: route.request().method() === 'GET' ? '[]' : '',
    })
  )

  for (const route of ROUTES) {
    const report: PageReport = {
      route,
      consoleErrors: [],
      failedRequests: [],
      deadButtons: [],
      notes: [],
    }
    activeReport = report
    try {
      await gotoHashRoute(page, route)
      await probeButtons(page, report)
    } catch (e) {
      report.notes.push(`Navigation error: ${(e as Error).message}`)
    }
    allReports.push(report)
  }

  mkdirSync(dirname(REPORT_PATH), { recursive: true })
  writeFileSync(REPORT_PATH, JSON.stringify(allReports, null, 2))

  const blockingIssues = allReports.flatMap((report) => [
    ...report.consoleErrors.map((message) => `${report.route} console: ${message}`),
    ...report.failedRequests.map(
      (request) =>
        `${report.route} request: ${request.status ?? request.failure ?? 'failed'} ${request.url}`
    ),
    ...report.notes.map((message) => `${report.route} note: ${message}`),
  ])

  expect(blockingIssues).toEqual([])
})
