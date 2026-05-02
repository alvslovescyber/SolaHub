import { test, expect, type Page } from '@playwright/test'

async function registerAndLogin(page: Page) {
  await page.goto('/#/register')
  const email = `plans_${Date.now()}@example.com`
  await page.getByLabel('Display name').fill('Plans User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('SecureP@ss1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/#\/$/, { timeout: 10_000 })
}

test.describe('Reading Plans', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('navigate to plans page', async ({ page }) => {
    await page.goto('/#/plans')
    await expect(page.getByText('Walk through Scripture, on your own or with your church')).toBeVisible()
  })

  test('create a plan and navigate to detail', async ({ page }) => {
    await page.goto('/#/plans')

    await page.getByRole('button', { name: 'New plan' }).click()

    await page
      .getByPlaceholder('Gospels in 30 days')
      .fill('Genesis in 30 Days')
    await page.getByPlaceholder('Description').fill('Read through the book of Genesis')

    await page.getByRole('button', { name: 'Create plan' }).click()

    // Should navigate to plan detail
    await expect(page).toHaveURL(/#\/plans\//, { timeout: 10_000 })
    await expect(page.getByText('Genesis in 30 Days')).toBeVisible()
  })
})
