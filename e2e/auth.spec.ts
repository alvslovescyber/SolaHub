import { test, expect } from '@playwright/test'

const uniqueEmail = () => `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`

test.describe('Authentication', () => {
  test('shows login page on first load', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/#\/login/)
    await expect(page.getByText('Sign in to your account')).toBeVisible()
  })

  test('register → redirect to dashboard', async ({ page }) => {
    await page.goto('/#/register')

    await page.getByLabel('Display name').fill('Test User')
    await page.getByLabel('Email').fill(uniqueEmail())
    await page.getByLabel('Password').fill('SecureP@ss1')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(/#\/$/, { timeout: 10_000 })
  })

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/#/login')

    await page.getByLabel('Email').fill('nobody@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Error message should appear
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5_000 })
  })

  test('logout clears session and redirects', async ({ page }) => {
    // Register first
    await page.goto('/#/register')
    await page.getByLabel('Display name').fill('Logout User')
    await page.getByLabel('Email').fill(uniqueEmail())
    await page.getByLabel('Password').fill('SecureP@ss1')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/#\/$/, { timeout: 10_000 })

    // Navigate to settings and sign out
    await page.goto('/#/settings')
    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page).toHaveURL(/#\/login/, { timeout: 5_000 })
  })
})
