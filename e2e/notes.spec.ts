import { test, expect, type Page } from '@playwright/test'

async function registerAndLogin(page: Page) {
  await page.goto('/#/register')
  const email = `notes_${Date.now()}@example.com`
  await page.getByLabel('Display name').fill('Notes User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('SecureP@ss1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/#\/$/, { timeout: 10_000 })
}

test.describe('Notes', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('navigate to notes page', async ({ page }) => {
    await page.goto('/#/notes')
    await expect(page.getByText('Verse-by-verse reflections and study notes')).toBeVisible()
  })

  test('create a note and see it in the list', async ({ page }) => {
    await page.goto('/#/notes')

    await page.getByRole('button', { name: 'New note' }).click()

    await page.getByPlaceholder('JHN.3.16').fill('JHN.3.16')
    await page.getByPlaceholder(/Your note/).fill('For God so loved the world that he gave his only Son.')
    await page.getByPlaceholder('faith, grace (comma separated)').fill('love, salvation')

    await page.getByRole('button', { name: 'Save note' }).click()

    await expect(page.getByText('JHN.3.16')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('For God so loved the world')).toBeVisible()
  })
})
