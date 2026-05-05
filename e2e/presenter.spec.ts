import { test, expect } from '@playwright/test'
import {
  collectPageIssues,
  expectNoPageIssues,
  loginAsTestUser,
  registerUniqueUser,
  stubBibleApi,
} from './support/auth'

test.describe('Presenter', () => {
  test.beforeEach(async ({ page }) => {
    await stubBibleApi(page)
    await loginAsTestUser(page)
  })

  test('loads song slides and exercises queue, blanking, and web display overlay', async ({
    page,
  }) => {
    const issues = collectPageIssues(page)

    await page.goto('/#/presenter')
    await expect(page.getByRole('heading', { name: 'Presenter' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open display' })).toBeDisabled()

    await page.getByRole('button', { name: 'Songs' }).click()
    await page.getByPlaceholder(/Search songs/).fill('Amazing')
    await page
      .getByRole('button', { name: /Amazing Grace/ })
      .first()
      .click()
    await expect(page.getByText('Slides · 5')).toBeVisible()
    await expect(page.getByText('1 / 5')).toBeVisible()

    await page.getByRole('button', { name: /Next/ }).click()
    await expect(page.getByText('2 / 5')).toBeVisible()
    await page.getByRole('button', { name: /Prev/ }).click()
    await expect(page.getByText('1 / 5')).toBeVisible()

    await page.getByRole('button', { name: 'Blank' }).click()
    await expect(page.getByText('Screen blanked')).toBeVisible()
    await page.getByRole('button', { name: 'Show', exact: true }).click()
    await expect(page.getByText('Screen blanked')).toHaveCount(0)

    await page.getByRole('button', { name: 'Navy' }).click()
    await page.getByRole('button', { name: 'Large' }).click()
    await page.getByRole('button', { name: 'Show reference' }).click()

    await page.getByRole('button', { name: 'Open display' }).click()
    await expect(page.getByText(/Click .* Space to advance/)).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press('ArrowDown')
    await expect(page.getByText('2 / 5').first()).toBeVisible()
    await page.keyboard.press('ArrowUp')
    await expect(page.getByText('1 / 5').first()).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText('2 / 5').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText(/Click .* Space to advance/)).toHaveCount(0)

    await page.getByRole('button', { name: 'Add song' }).click()
    await page.getByLabel('Title').fill('Playwright Test Song')
    await page.getByLabel('Author').fill('QA')
    await page.getByPlaceholder(/Paste lyrics here/).fill('Line one\nLine two')
    await page.getByRole('button', { name: 'Save song' }).click()
    await page.getByPlaceholder(/Search songs/).fill('Playwright Test Song')
    await expect(
      page.getByRole('button', { name: /Playwright Test Song QA/ }).first()
    ).toBeVisible()

    expectNoPageIssues(issues)
  })

  test('loads scripture slides from the book browser and opens the display overlay', async ({
    page,
  }) => {
    const issues = collectPageIssues(page)

    await page.goto('/#/presenter')
    await page.getByRole('button', { name: 'Scripture' }).click()
    await page.getByPlaceholder(/Search books/).fill('John')
    await page
      .locator('button')
      .filter({ hasText: 'John' })
      .filter({ hasText: '21 ch' })
      .first()
      .click()
    await page.getByRole('button', { name: '3', exact: true }).click()

    await expect(page.getByText('3 verses · tap to jump')).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByRole('button', {
        name: '16 For God so loved the world that he gave his only Son.',
        exact: true,
      })
    ).toBeVisible()
    await expect(page.getByText('Slides · 3')).toBeVisible()

    await page.getByRole('button', { name: /Next/ }).click()
    await expect(page.getByText('2 / 3')).toBeVisible()
    await page.getByRole('button', { name: /Prev/ }).click()
    await expect(page.getByText('1 / 3')).toBeVisible()

    await page.getByRole('button', { name: 'Open display' }).click()
    await expect(page.getByText(/Click .* Space to advance/)).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press('Escape')
    await expect(page.getByText(/Click .* Space to advance/)).toHaveCount(0)

    expectNoPageIssues(issues)
  })

  test('preserves imported Notations image backgrounds in Presenter', async ({ page }) => {
    const issues = collectPageIssues(page)

    await page.evaluate(() => {
      localStorage.setItem(
        'solahub:notations:v1',
        JSON.stringify([
          {
            id: 'deck-e2e',
            title: 'Image Notations',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            slides: [
              {
                source: 'notation',
                verseRef: 'notation-e2e',
                title: 'Image backed notation',
                text: 'Image backed notation',
                background: {
                  type: 'image',
                  value:
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEtAJJXIDTjwAAAABJRU5ErkJggg==',
                  textTone: 'light',
                },
                elements: [
                  {
                    id: 'el-e2e',
                    kind: 'text',
                    text: 'Image backed notation',
                    x: 12,
                    y: 20,
                    width: 76,
                    height: 16,
                    fontSize: 48,
                    color: '#ffffff',
                    align: 'center',
                    fontWeight: 'bold',
                  },
                ],
              },
            ],
          },
        ])
      )
    })

    await page.goto('/#/notes')
    await page.getByRole('button', { name: 'Load' }).click()
    await page.goto('/#/presenter')

    await expect(page.getByText('Image backed notation').first()).toBeVisible()
    const notationStage = page.locator('.notation-stage').first()
    await expect(notationStage).toBeVisible()
    await expect
      .poll(async () => notationStage.evaluate((el) => getComputedStyle(el).backgroundImage))
      .toContain('data:image/png')

    expectNoPageIssues(issues)
  })
})

test.describe('Presenter access', () => {
  test('presenter display route does not require its own login', async ({ page }) => {
    await page.goto('/#/presenter-display')

    await expect(page.getByTestId('presenter-display-root')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Welcome back to SolaHub/ })).toHaveCount(0)
  })

  test('member accounts can use presenter pages', async ({ page }) => {
    await registerUniqueUser(page, 'member', 'Member User')

    await page.goto('/#/presenter')
    await expect(page).toHaveURL(/#\/presenter/)
    await expect(page.getByRole('heading', { name: 'Presenter' })).toBeVisible()
  })
})
