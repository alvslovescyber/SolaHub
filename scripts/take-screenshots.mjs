/**
 * Screenshot script for SolaHub README.
 * Run with: node scripts/take-screenshots.mjs
 * Requires: npm run dev:web pointing at the production API.
 */

import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs', 'screenshots')
const BASE = 'http://localhost:3000'

// Set these via env vars: EMAIL=... PASSWORD=... node scripts/take-screenshots.mjs
const EMAIL = process.env.EMAIL ?? ''
const PASSWORD = process.env.PASSWORD ?? ''
if (!EMAIL || !PASSWORD) {
  console.error('Set EMAIL and PASSWORD env vars before running.')
  process.exit(1)
}

async function shot(page, filename, ms = 2500) {
  await page.waitForTimeout(ms)
  await page.screenshot({ path: path.join(OUT, filename) })
  console.log(`  ✓ ${filename}`)
}

async function navigateTo(page, hash) {
  await page.evaluate((h) => {
    const router = document.getElementById('app')?.__vue_app__?.config?.globalProperties?.$router
    if (router) router.push(h)
    else window.location.hash = h
  }, hash)
}

async function main() {
  console.log('Starting SolaHub screenshot run…')
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--disable-site-isolation-trials', '--no-sandbox'],
  })

  // ── Public pages ─────────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()

    await page.goto(`${BASE}/#/login`)
    await shot(page, 'login.png', 2000)

    await navigateTo(page, '/register')
    await shot(page, 'register.png', 2000)

    await navigateTo(page, '/download/desktop')
    await shot(page, 'download.png', 2000)

    await ctx.close()
  }

  // ── Authenticated pages — log in for real ────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()

    // Go to login
    await page.goto(`${BASE}/#/login`)
    await page.waitForTimeout(1500)

    // Fill credentials and submit
    await page.fill('input[type="email"], input[placeholder*="example"]', EMAIL)
    await page.fill('input[type="password"], input[placeholder*="password"]', PASSWORD)
    await page.click('button[type="submit"], button:has-text("Sign in")')

    // Wait for redirect to dashboard after login
    await page.waitForTimeout(4000)
    console.log('  Logged in — current URL:', page.url())

    // Dashboard
    await shot(page, 'dashboard.png', 2000)

    // Bible reader
    await navigateTo(page, '/bible')
    await shot(page, 'bible.png', 4000)

    // Notes
    await navigateTo(page, '/notes')
    await shot(page, 'notes.png', 3000)

    // Reading plans
    await navigateTo(page, '/plans')
    await shot(page, 'plans.png', 3000)

    // Presenter
    await navigateTo(page, '/presenter')
    await shot(page, 'presenter.png', 3000)

    // Community
    await navigateTo(page, '/community')
    await shot(page, 'community.png', 3000)

    // Calendar
    await navigateTo(page, '/calendar')
    await shot(page, 'calendar.png', 3000)

    // Settings
    await navigateTo(page, '/settings')
    await shot(page, 'settings.png', 3000)

    await ctx.close()
  }

  await browser.close()
  console.log(`\nAll screenshots saved to docs/screenshots/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
