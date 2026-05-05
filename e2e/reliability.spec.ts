import { test, expect, type Page } from '@playwright/test'
import {
  collectPageIssues,
  expectNoPageIssues,
  mockAuthenticatedSession,
  mockStableAppApi,
  stubBibleApi,
} from './support/auth'

const ROUTE_HEALTH_CHECKS = [
  { path: '/', heading: /Good morning|Good afternoon|Good evening/ },
  { path: '/calendar', heading: 'Calendar' },
  { path: '/inbox', heading: 'Inbox' },
  { path: '/bible', heading: 'Bible' },
  { path: '/plans', heading: 'Reading plans' },
  { path: '/plans/plan-reliability-1', heading: 'Reliability Plan' },
  { path: '/notes', heading: 'Notations' },
  { path: '/presenter', heading: 'Presenter' },
  { path: '/community', heading: 'Community' },
  { path: '/settings', heading: 'Settings' },
] as const

async function gotoHashRoute(page: Page, path: string): Promise<void> {
  await page.goto(`/#${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
}

async function expectNoHorizontalDocumentOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    return Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth
  })

  expect(overflow).toBeLessThanOrEqual(2)
}

test.describe('Reliability smoke gates', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockStableAppApi(page)
    await stubBibleApi(page)
  })

  test('renders every authenticated route without runtime errors or horizontal overflow', async ({
    page,
  }) => {
    const issues = collectPageIssues(page)
    await page.setViewportSize({ width: 1440, height: 900 })

    for (const route of ROUTE_HEALTH_CHECKS) {
      await gotoHashRoute(page, route.path)
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible({
        timeout: 10_000,
      })
      await expectNoHorizontalDocumentOverflow(page)
    }

    expectNoPageIssues(issues)
  })

  test('keeps auth and not-found routes recoverable', async ({ page }) => {
    const issues = collectPageIssues(page)

    await page.goto('/#/login')
    await expect(page).toHaveURL(/#\/$/)

    await gotoHashRoute(page, '/not-a-real-route')
    await expect(page.getByText('Page not found')).toBeVisible()
    await page.getByRole('link', { name: 'Back to dashboard' }).click()
    await expect(page).toHaveURL(/#\/$/)
    await expect(
      page.getByRole('heading', { name: /Good morning|Good afternoon|Good evening/ })
    ).toBeVisible()

    expectNoPageIssues(issues)
  })
})
