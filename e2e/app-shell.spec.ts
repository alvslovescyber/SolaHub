import { test, expect } from '@playwright/test'
import {
  collectPageIssues,
  expectNoPageIssues,
  loginAsTestUser,
  stubBibleApi,
} from './support/auth'

test.describe('App shell and primary routes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('navigates every sidebar route and app chrome action', async ({ page }) => {
    const issues = collectPageIssues(page)
    await stubBibleApi(page)

    await expect(
      page.getByRole('heading', { name: /Alvis Test|Good|Morning|Afternoon|Evening/i })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Notifications' }).first().click()
    await expect(page.getByText("You're all clear")).toBeVisible()
    await page.getByRole('button', { name: 'Close notifications' }).click()

    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible()
    await page.getByRole('button', { name: 'Expand sidebar' }).click()
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible()

    const sidebarRoutes = [
      { name: 'Calendar', hash: /#\/calendar/, text: 'Calendar coming soon' },
      { name: 'Bible', hash: /#\/bible/, text: 'Bible' },
      { name: 'Plans', hash: /#\/plans/, text: 'Reading plans' },
      { name: 'Notations', hash: /#\/notes/, text: 'Notations' },
      { name: 'Presenter', hash: /#\/presenter/, text: 'Presenter' },
      { name: 'Community', hash: /#\/community/, text: 'Community' },
    ]

    for (const route of sidebarRoutes) {
      await page.getByRole('button', { name: route.name }).click()
      await expect(page).toHaveURL(route.hash)
      await expect(page.getByText(route.text).first()).toBeVisible({ timeout: 10_000 })
    }

    await page
      .getByRole('button', { name: /Search/ })
      .first()
      .click()
    await page.getByPlaceholder(/Type a command or search/).fill('Inbox')
    await page.getByRole('button', { name: 'Inbox' }).click()
    await expect(page).toHaveURL(/#\/inbox/)
    await expect(page.getByText("You're all caught up")).toBeVisible()

    await page.getByRole('tab', { name: 'Mentions' }).click()
    await expect(page.getByText('No mentions yet')).toBeVisible()
    await page.getByRole('tab', { name: 'Prayer' }).click()
    await expect(page.getByText('No prayer requests yet')).toBeVisible()

    expectNoPageIssues(issues)
  })

  test('unknown routes render a recoverable 404', async ({ page }) => {
    const issues = collectPageIssues(page)

    await page.goto('/#/not-a-real-route')
    await expect(page.getByText('Page not found')).toBeVisible()
    await page.getByRole('link', { name: 'Back to dashboard' }).click()
    await expect(page).toHaveURL(/#\/$/)

    expectNoPageIssues(issues)
  })
})
