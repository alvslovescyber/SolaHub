import { test, expect } from '@playwright/test'
import { registerUniqueUser, uniqueEmail } from './support/auth'

test.describe('Authentication', () => {
  test('shows login page on first load', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/#\/login/)
    await expect(page.getByText('Welcome back to SolaHub')).toBeVisible()
  })

  test('register → redirect to dashboard', async ({ page }) => {
    await page.goto('/#/register')

    await page.getByLabel('Display name').fill('Test User')
    await page.getByLabel('Email').fill(uniqueEmail('auth'))
    await page.getByLabel('Password').fill('SecureP@ss1')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(/#\/$/, { timeout: 10_000 })
  })

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/#/login')

    await page.getByLabel('Email').fill('nobody@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in with email' }).click()

    // Error message should appear
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5_000 })
  })

  test('logout clears session and redirects', async ({ page }) => {
    await registerUniqueUser(page, 'logout', 'Logout User')

    await page.goto('/#/settings')
    await page.getByRole('button', { name: 'Security' }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page).toHaveURL(/#\/login/, { timeout: 5_000 })
  })
})
