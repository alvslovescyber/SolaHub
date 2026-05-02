import { expect, type Page, type Route } from '@playwright/test'

export const TEST_USER_EMAIL = process.env.E2E_USER ?? 'alvistest@gmail.com'
export const TEST_USER_PASSWORD = process.env.E2E_PASS ?? 'Password1'

export function uniqueEmail(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`
}

export async function clearBrowserState(page: Page): Promise<void> {
  await page.goto('/#/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

export async function loginAsTestUser(page: Page): Promise<void> {
  await clearBrowserState(page)
  await page.goto('/#/login')
  await page.getByLabel('Email').fill(TEST_USER_EMAIL)
  await page.getByLabel('Password').fill(TEST_USER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in with email' }).click()
  await expect(page).toHaveURL(/#\/$/, { timeout: 10_000 })
}

export async function registerUniqueUser(
  page: Page,
  prefix = 'e2e',
  displayName = 'E2E User'
): Promise<string> {
  const email = uniqueEmail(prefix)
  await clearBrowserState(page)
  await page.goto('/#/register')
  const createHeading = page.getByRole('heading', { name: 'Create your account' })

  await expect(page.locator('body')).toContainText(/Create your account|Welcome back to SolaHub/)
  if (!(await createHeading.isVisible())) {
    await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible()
    await page.getByRole('link', { name: 'Create one' }).click()
  }
  await expect(createHeading).toBeVisible()
  await page.getByLabel('Display name').fill(displayName)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('SecureP@ss1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/#\/$/, { timeout: 10_000 })
  return email
}

export interface CollectedPageIssue {
  type: 'console' | 'pageerror' | 'request' | 'response'
  message: string
}

export function collectPageIssues(page: Page): CollectedPageIssue[] {
  const issues: CollectedPageIssue[] = []

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (text.includes('Download the Vue Devtools extension')) return
    issues.push({ type: 'console', message: text })
  })

  page.on('pageerror', (err) => {
    issues.push({ type: 'pageerror', message: err.message })
  })

  page.on('requestfailed', (req) => {
    const url = req.url()
    if (url.includes('/favicon')) return
    issues.push({ type: 'request', message: `${url} ${req.failure()?.errorText ?? ''}`.trim() })
  })

  page.on('response', (res) => {
    if (res.status() >= 500) {
      issues.push({ type: 'response', message: `${res.status()} ${res.url()}` })
    }
  })

  return issues
}

export function expectNoPageIssues(issues: CollectedPageIssue[]): void {
  expect(issues.map((issue) => `${issue.type}: ${issue.message}`)).toEqual([])
}

export async function stubBibleApi(page: Page): Promise<void> {
  await page.route('https://bible-api.com/**', async (route: Route) => {
    const url = route.request().url().toLowerCase()
    const isJohn = url.includes('john')
    const isVerseLookup = url.includes('3:16')

    const verses = isJohn
      ? [
          {
            book_id: 'JHN',
            book_name: 'John',
            chapter: 3,
            verse: 16,
            text: 'For God so loved the world that he gave his only Son.',
          },
          {
            book_id: 'JHN',
            book_name: 'John',
            chapter: 3,
            verse: 17,
            text: 'For God did not send his Son into the world to condemn the world.',
          },
          {
            book_id: 'JHN',
            book_name: 'John',
            chapter: 3,
            verse: 18,
            text: 'Whoever believes in him is not condemned.',
          },
        ]
      : [
          {
            book_id: 'GEN',
            book_name: 'Genesis',
            chapter: 1,
            verse: 1,
            text: 'In the beginning God created the heavens and the earth.',
          },
          {
            book_id: 'GEN',
            book_name: 'Genesis',
            chapter: 1,
            verse: 2,
            text: 'The earth was without form, and void.',
          },
          {
            book_id: 'GEN',
            book_name: 'Genesis',
            chapter: 1,
            verse: 3,
            text: 'And God said, Let there be light: and there was light.',
          },
        ]

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reference: isJohn ? 'John 3' : 'Genesis 1',
        verses: isVerseLookup ? [verses[0]] : verses,
      }),
    })
  })
}
