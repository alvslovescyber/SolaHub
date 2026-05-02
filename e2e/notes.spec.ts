import { test, expect, type Page } from '@playwright/test'
import { registerUniqueUser, stubBibleApi } from './support/auth'

async function registerAndLogin(page: Page) {
  await registerUniqueUser(page, 'notes', 'Notes User')
}

test.describe('Notes', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('navigate to notes page', async ({ page }) => {
    await page.goto('/#/notes')
    await expect(page.getByRole('heading', { name: 'Notations' })).toBeVisible()
    await expect(page.getByText('Slide notes, verses, and church-ready summaries')).toBeVisible()
  })

  test('build a notation slide and open the display overlay', async ({ page }) => {
    await stubBibleApi(page)
    await page.goto('/#/notes')

    await expect(page.getByRole('button', { name: 'Meeting Summary', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'New slide' }).click()
    await expect(page.getByText('2 / 2')).toBeVisible()
    await expect(page.getByLabel('Notation output monitor')).toBeVisible()
    await page.getByRole('button', { name: 'Text', exact: true }).click()
    await expect(page.getByRole('button', { name: 'New text block', exact: true })).toBeVisible()
    await page.getByRole('textbox', { name: 'Text' }).fill('Slide 2 visible text')
    const movableText = page.getByRole('button', { name: 'Slide 2 visible text', exact: true })
    await expect(movableText).toBeVisible()

    await movableText.click()
    const clickedBox = await movableText.boundingBox()
    expect(clickedBox).not.toBeNull()
    if (!clickedBox) throw new Error('Text block did not render after click')
    await page.mouse.move(
      clickedBox.x + clickedBox.width / 2 + 120,
      clickedBox.y + clickedBox.height / 2 + 80,
      { steps: 4 }
    )
    const afterClickMoveBox = await movableText.boundingBox()
    expect(afterClickMoveBox).not.toBeNull()
    if (!afterClickMoveBox) throw new Error('Text block disappeared after click release')
    expect(Math.abs(afterClickMoveBox.x - clickedBox.x)).toBeLessThan(2)
    expect(Math.abs(afterClickMoveBox.y - clickedBox.y)).toBeLessThan(2)

    const startBox = await movableText.boundingBox()
    expect(startBox).not.toBeNull()
    if (!startBox) throw new Error('Text block did not render')
    await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      startBox.x + startBox.width / 2 + 90,
      startBox.y + startBox.height / 2 + 45,
      {
        steps: 6,
      }
    )
    await page.mouse.up()

    const droppedBox = await movableText.boundingBox()
    expect(droppedBox).not.toBeNull()
    if (!droppedBox) throw new Error('Text block disappeared after drag')
    await page.mouse.move(
      droppedBox.x + droppedBox.width / 2 + 140,
      droppedBox.y + droppedBox.height / 2 + 90,
      { steps: 6 }
    )
    const settledBox = await movableText.boundingBox()
    expect(settledBox).not.toBeNull()
    if (!settledBox) throw new Error('Text block disappeared after pointer release')
    expect(Math.abs(settledBox.x - droppedBox.x)).toBeLessThan(2)
    expect(Math.abs(settledBox.y - droppedBox.y)).toBeLessThan(2)

    await expect(
      page.getByRole('button', { name: /Slide 2: Slide 2 Slide 2 visible text/ })
    ).toBeVisible()

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEtAJJXIDTjwAAAABJRU5ErkJggg==',
      'base64'
    )
    await page.locator('input[type="file"]').setInputFiles({
      name: 'notation-background.png',
      mimeType: 'image/png',
      buffer: png,
    })
    await expect(page.getByLabel('Slide background value')).toHaveValue(/data:image\/png/)

    await page.getByPlaceholder('John 3:16 or JHN.3.16').fill('John 3:16')
    await page.getByRole('button', { name: 'Insert' }).click()
    await expect(
      page.getByRole('button', {
        name: 'John 3:16 For God so loved the world that he gave his only Son.',
        exact: true,
      })
    ).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Present' }).click()
    await expect(page.getByText(/Click .* Space to advance/)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Slide 2 visible text').last()).toBeVisible()
    await expect(
      page.getByText('For God so loved the world that he gave his only Son.').last()
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText(/Click .* Space to advance/)).toHaveCount(0)
  })

  test('create a note and see it in the list', async ({ page }) => {
    await page.goto('/#/notes')

    await page.getByRole('button', { name: 'New note' }).click()

    const noteDialog = page.getByRole('dialog')
    await noteDialog.getByLabel('Verse reference').fill('JHN.3.16')
    await noteDialog
      .getByPlaceholder(/Your note/)
      .fill('For God so loved the world that he gave his only Son.')
    await noteDialog.getByPlaceholder('faith, grace (comma separated)').fill('love, salvation')

    await noteDialog.getByRole('button', { name: 'Save note' }).click()

    await expect(page.getByText('JHN.3.16')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('For God so loved the world')).toBeVisible()
  })

  test('edit and delete a note', async ({ page }) => {
    await page.goto('/#/notes')

    await page.getByRole('button', { name: 'New note' }).click()
    const createDialog = page.getByRole('dialog')
    await createDialog.getByLabel('Verse reference').fill('ROM.8.1')
    await createDialog.getByPlaceholder(/Your note/).fill('Initial note text')
    await createDialog.getByRole('button', { name: 'Save note' }).click()
    await expect(page.getByText('Initial note text')).toBeVisible({ timeout: 5_000 })

    await page.getByRole('button', { name: 'Edit note' }).click()
    const editDialog = page.getByRole('dialog')
    await editDialog.getByPlaceholder(/Your note/).fill('Updated note text')
    await editDialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Updated note text')).toBeVisible({ timeout: 5_000 })

    await page.getByRole('button', { name: 'Delete note' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByText('Updated note text')).toHaveCount(0)
  })
})
