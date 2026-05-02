import { test, expect, type Page } from '@playwright/test'
import { registerUniqueUser } from './support/auth'

async function registerAndLogin(page: Page) {
  await registerUniqueUser(page, 'plans', 'Plans User')
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

    await page.getByLabel('Title').fill('Genesis in 30 Days')
    await page.getByLabel('Description').fill('Read through the book of Genesis')

    await page.getByRole('button', { name: 'Create plan' }).click()

    // Should navigate to plan detail
    await expect(page).toHaveURL(/#\/plans\//, { timeout: 10_000 })
    await expect(page.getByText('Genesis in 30 Days').first()).toBeVisible()
  })

  test('add a day, publish, mark progress, and archive a plan', async ({ page }) => {
    await page.goto('/#/plans')
    await page.getByRole('button', { name: 'New plan' }).click()
    await page.getByLabel('Title').fill('Romans Launch Plan')
    await page.getByLabel('Description').fill('A short QA reading plan')
    await page.getByRole('button', { name: 'Create plan' }).click()
    await expect(page).toHaveURL(/#\/plans\//, { timeout: 10_000 })
    await expect(page.getByText('Romans Launch Plan').first()).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Add first day' }).click()
    await page.getByLabel('Day title').fill('The opening chapter')
    await page.locator('select').first().selectOption('ROM')
    await page.locator('select').nth(1).selectOption('1')
    await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Romans 1')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Add day' }).click()
    await expect(page.getByText('The opening chapter')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Publish plan' }).click()
    await expect(page.getByText('Active').first()).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Mark done' }).first().click()
    await expect(page.getByText('Plan complete!')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Archive' }).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page.getByText('Archived').first()).toBeVisible({ timeout: 10_000 })
  })
})
