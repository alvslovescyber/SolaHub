import { test, expect, type Page } from '@playwright/test'
import {
  mockAuthenticatedSession,
  mockStableAppApi,
  seedExpiredOfflineSession,
  stubBibleApi,
} from './support/auth'

async function navigateLoadedHashRoute(page: Page, path: string): Promise<void> {
  await requestHashRoute(page, path)
  await page.waitForFunction((hash) => window.location.hash === hash, `#${path}`)
}

async function requestHashRoute(page: Page, path: string): Promise<void> {
  await page.evaluate((hash) => {
    window.location.hash = hash
  }, `#${path}`)
}

async function forceInPageOffline(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })
    window.dispatchEvent(new Event('offline'))
  })
}

function isRemoteAppDependency(url: string): boolean {
  return url.includes('/api/') || url.includes('/hubs/') || url.startsWith('https://bible-api.com/')
}

test.describe('Offline local-first service flows', () => {
  test.beforeEach(async ({ page }) => {
    await mockStableAppApi(page)
    await stubBibleApi(page)
  })

  test('keeps Bible, Notations, and Presenter usable after WiFi drops', async ({
    page,
    context,
  }) => {
    const user = await mockAuthenticatedSession(page)

    await page.goto('/#/bible')
    await expect(page.getByRole('heading', { name: 'Bible' })).toBeVisible()
    await expect(page.getByText('In the beginning God created')).toBeVisible({ timeout: 10_000 })

    await page.goto('/#/notes')
    await expect(page.getByRole('heading', { name: 'Notations' })).toBeVisible()

    await page.goto('/#/presenter')
    await expect(page.getByRole('heading', { name: 'Presenter' })).toBeVisible()

    await seedExpiredOfflineSession(page, user)

    const unexpectedRemoteRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (isRemoteAppDependency(url)) unexpectedRemoteRequests.push(url)
    })

    await context.setOffline(true)
    await forceInPageOffline(page)

    await navigateLoadedHashRoute(page, '/bible')
    await expect(page.getByRole('heading', { name: 'Bible' })).toBeVisible()
    await expect(page.getByText('In the beginning God created')).toBeVisible()

    await navigateLoadedHashRoute(page, '/notes')
    await expect(page.getByRole('heading', { name: 'Notations' })).toBeVisible()
    await page.getByRole('button', { name: 'New slide' }).click()
    await expect(page.getByText('2 / 2')).toBeVisible()
    await page.getByRole('button', { name: 'Text', exact: true }).click()
    await page.getByRole('textbox', { name: 'Text' }).fill('Offline service slide')
    await expect(
      page.getByRole('button', { name: 'Offline service slide', exact: true })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Present', exact: true }).click()
    await expect(page.getByText(/Click .* Space to advance/)).toBeVisible()
    await expect(page.getByText('Offline service slide').last()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText(/Click .* Space to advance/)).toHaveCount(0)

    await navigateLoadedHashRoute(page, '/presenter')
    await expect(page.getByRole('heading', { name: 'Presenter' })).toBeVisible()
    await page.getByRole('button', { name: 'Songs' }).click()
    await page.getByPlaceholder(/Search songs/).fill('Amazing')
    await page
      .getByRole('button', { name: /Amazing Grace/ })
      .first()
      .click()
    await expect(page.getByText('Slides · 5')).toBeVisible()
    await page.getByRole('button', { name: 'Open display' }).click()
    await expect(page.getByText(/Click .* Space to advance/)).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText('2 / 5').first()).toBeVisible()

    expect(unexpectedRemoteRequests).toEqual([])
  })

  test('does not unlock offline-ready routes without a cached user', async ({ page, context }) => {
    await mockAuthenticatedSession(page)
    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({ status: 204 })
    })
    await page.goto('/#/notes')
    await expect(page.getByRole('heading', { name: 'Notations' })).toBeVisible()
    await page.getByRole('button', { name: /Reliability User/ }).click()
    await page.getByText('Sign out').click()
    await expect(page.getByRole('heading', { name: 'Welcome back to SolaHub' })).toBeVisible()

    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('solahub:access_token', 'e2e.expired.signature')
      localStorage.setItem('solahub:refresh_token', 'offline-refresh-token')
    })

    await context.setOffline(true)
    await forceInPageOffline(page)
    await requestHashRoute(page, '/notes')

    await expect(page.getByRole('heading', { name: 'Welcome back to SolaHub' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Notations' })).toHaveCount(0)
  })
})
