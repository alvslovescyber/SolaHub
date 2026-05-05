import { test, expect } from '@playwright/test'
import {
  collectPageIssues,
  expectNoPageIssues,
  loginAsTestUser,
  stubBibleApi,
} from './support/auth'

test.describe('Bible reader', () => {
  test.beforeEach(async ({ page }) => {
    await stubBibleApi(page)
    await loginAsTestUser(page)
  })

  test('loads scripture, searches by reference, and opens verse tools', async ({ page }) => {
    const issues = collectPageIssues(page)

    await page.goto('/#/bible')
    await expect(page.getByRole('heading', { name: 'Bible' })).toBeVisible()
    await expect(page.getByText('In the beginning God created')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Reading appearance' }).click()
    await page.getByRole('button', { name: 'Large' }).click()
    await page.getByRole('button', { name: 'Relaxed' }).click()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Search Bible' }).click()
    await page.getByPlaceholder(/Try John 3:16/).fill('John 3:16')
    await expect(page.getByRole('button', { name: /John 3:16 For God so loved/ })).toBeVisible({
      timeout: 10_000,
    })
    await page.getByRole('button', { name: /John 3:16/ }).click()
    const verse = page.locator('article span').filter({ hasText: 'For God so loved' }).first()
    await expect(verse).toBeVisible()

    await verse.click()
    await verse.click({ button: 'right' })
    await expect(page.getByText('Make a note')).toBeVisible()
    await page.getByTitle('Yellow').click()

    await verse.click({ button: 'right' })
    await page.getByText('Make a note').click()
    await page.getByPlaceholder(/Write your reflection/).fill('A local reader note')
    await page.getByRole('button', { name: 'Save note' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    expectNoPageIssues(issues)
  })

  test('book filtering and no-result states stay usable', async ({ page }) => {
    const issues = collectPageIssues(page)

    await page.goto('/#/bible')
    await page.getByPlaceholder(/Search books/).fill('zzzz')
    await expect(page.getByText('Old Testament')).toHaveCount(0)
    await page.getByPlaceholder(/Search books/).fill('John')
    await expect(page.getByRole('button', { name: /John/ }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Search Bible' }).click()
    await page.getByPlaceholder(/Try John 3:16/).fill('not-present')
    await expect(page.getByText(/No matches in this chapter|No results/)).toBeVisible({
      timeout: 10_000,
    })

    expectNoPageIssues(issues)
  })
})
