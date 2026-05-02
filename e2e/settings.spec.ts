import { test, expect } from '@playwright/test'
import { collectPageIssues, expectNoPageIssues, loginAsTestUser } from './support/auth'

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('walks every settings section and validates safe controls', async ({ page }) => {
    const issues = collectPageIssues(page)

    await page.goto('/#/settings')
    const main = page.locator('main')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Profile' })).toBeVisible()

    await main.getByLabel('Bio').fill('Testing settings from Playwright')
    await main.getByRole('button', { name: 'Cancel' }).click()
    await expect(main.getByLabel('Bio')).toHaveValue('')

    await main.getByRole('button', { name: 'Security' }).click()
    await expect(main.getByRole('heading', { name: 'Security' })).toBeVisible()
    await main.getByRole('button', { name: 'Update password' }).click()
    await expect(main.getByText('Please fill in every field.')).toBeVisible()

    await main.getByRole('button', { name: 'Notifications' }).click()
    await expect(main.getByRole('heading', { name: 'Notifications' })).toBeVisible()
    const mentions = main.getByRole('switch', { name: /Mentions/ })
    await expect(mentions).toHaveAttribute('aria-checked', 'true')
    await mentions.click()
    await expect(mentions).toHaveAttribute('aria-checked', 'false')

    await main.getByRole('button', { name: 'Bible & translations' }).click()
    await expect(main.getByLabel('Default translation')).toBeVisible()
    await main.getByLabel('Parallel translation').selectOption('')

    await main.getByRole('button', { name: 'Presenter' }).click()
    await expect(main.getByRole('heading', { name: 'Presenter' })).toBeVisible()
    await main.getByRole('button', { name: 'Large hall' }).click()
    await main.getByRole('button', { name: 'Gradient' }).click()
    await main.getByRole('switch', { name: /Show verse reference/ }).click()

    await main.getByRole('button', { name: 'Songs & media' }).click()
    await expect(main.getByLabel('Lyrics source')).toBeVisible()
    await main.getByRole('switch', { name: /Include copyright/ }).click()

    await main.getByRole('button', { name: 'Appearance' }).click()
    await main.getByRole('button', { name: 'Dark' }).click()
    await main.getByRole('button', { name: 'Light' }).click()

    await main.getByRole('button', { name: 'API tokens' }).click()
    await expect(main.getByText('Personal access tokens')).toBeVisible()

    expectNoPageIssues(issues)
  })
})
