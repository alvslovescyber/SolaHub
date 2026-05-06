import { expect, type Page, type Route } from '@playwright/test'
import type { User } from '../../src/types/user.types'
import type { ReadingPlan } from '../../src/types/plans.types'
import type { VerseNote } from '../../src/types/notes.types'

export const TEST_USER_EMAIL = process.env.E2E_USER ?? 'alvistest@gmail.com'
export const TEST_USER_PASSWORD = process.env.E2E_PASS ?? 'Password1'
const API_URL = process.env.VITE_API_URL ?? 'http://localhost:5000'
let defaultTestUserSeeded = false

export function uniqueEmail(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`
}

export function validAccessToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3_600 })
  ).toString('base64url')
  return `e2e.${payload}.signature`
}

export async function seedExpiredOfflineSession(page: Page, user: User): Promise<void> {
  await page.evaluate(
    ({ cachedUser }) => {
      localStorage.setItem('solahub:session', '1')
      localStorage.setItem(
        'solahub:offline-user',
        JSON.stringify({
          schemaVersion: 1,
          cachedAt: new Date().toISOString(),
          user: cachedUser,
        })
      )
    },
    { cachedUser: user }
  )
}

export async function clearBrowserState(page: Page): Promise<void> {
  await page.goto('/#/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

export async function loginAsTestUser(page: Page): Promise<void> {
  await ensureDefaultTestUser(page)
  await clearBrowserState(page)
  await page.goto('/#/login')
  await page.getByLabel('Email').fill(TEST_USER_EMAIL)
  await page.getByLabel('Password').fill(TEST_USER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in with email' }).click()
  await expect(page).toHaveURL(/#\/$/, { timeout: 10_000 })
}

async function ensureDefaultTestUser(page: Page): Promise<void> {
  if (defaultTestUserSeeded) return

  const response = await page.request.post(`${API_URL}/api/auth/register`, {
    data: {
      displayName: 'Alvis Test',
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    },
  })

  if (![201, 409].includes(response.status())) {
    throw new Error(`Unable to seed E2E login user: ${response.status()} ${await response.text()}`)
  }

  defaultTestUserSeeded = true
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

export async function mockAuthenticatedSession(
  page: Page,
  overrides: Partial<User> = {}
): Promise<User> {
  const user: User = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'reliability@example.com',
    displayName: 'Reliability User',
    role: 'Pastor',
    churchId: 'church-1',
    isEmailVerified: true,
    isActive: true,
    createdAt: '2026-05-05T12:00:00.000Z',
    ...overrides,
  }
  const accessToken = validAccessToken()

  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        user,
      }),
    })
  })

  await page.addInitScript(() => {
    localStorage.setItem('solahub:session', '1')
  }, undefined)

  return user
}

export async function mockStableAppApi(page: Page): Promise<void> {
  const now = '2026-05-05T12:00:00.000Z'
  const note: VerseNote = {
    id: 'note-reliability-1',
    userId: '00000000-0000-0000-0000-000000000001',
    verseRef: 'JHN.3.16',
    content: 'Reliability note for route health checks.',
    tags: ['reliability'],
    isShared: false,
    createdAt: now,
    updatedAt: now,
  }
  const plan: ReadingPlan = {
    id: 'plan-reliability-1',
    title: 'Reliability Plan',
    description: 'Stable mocked reading plan for route health checks.',
    status: 'Active',
    isPublic: true,
    createdBy: '00000000-0000-0000-0000-000000000001',
    createdAt: now,
    days: [{ dayNumber: 1, title: 'John 3', verseRefs: ['JHN.3.16'] }],
    participants: [
      {
        userId: '00000000-0000-0000-0000-000000000001',
        displayName: 'Reliability User',
        currentDay: 0,
        joinedAt: now,
      },
    ],
  }

  await page.route('**/api/notes**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([note]),
    })
  })

  await page.route('**/api/plans**', async (route) => {
    const url = new URL(route.request().url())
    const body = /\/api\/plans\/[^/]+$/.test(url.pathname) ? plan : [plan]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })

  await page.route('**/api/community**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
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
