import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { BookInfo } from '@/types/bible.types'

const invokeMock = vi.fn()

async function importTauriBibleService() {
  vi.resetModules()
  vi.doMock('@tauri-apps/api/core', () => ({
    invoke: invokeMock,
  }))
  vi.doMock('@/lib/platform', () => ({
    isTauri: true,
    isMac: false,
    modKeyLabel: 'Ctrl',
  }))
  return import('../bible.service')
}

describe('bible service', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it('uses the canonical book list when Tauri returns an empty local catalog', async () => {
    invokeMock.mockResolvedValueOnce([])
    const { bibleService } = await importTauriBibleService()

    const books = await bibleService.getBooks()

    expect(invokeMock).toHaveBeenCalledWith('get_book_list')
    expect(books).toHaveLength(66)
    expect(books[0]).toMatchObject({ shortName: 'GEN', longName: 'Genesis' })
  })

  it('uses the Tauri catalog when local books exist', async () => {
    const localBooks: BookInfo[] = [
      { shortName: 'JHN', longName: 'John', chapters: 21, testament: 'NT' },
    ]
    invokeMock.mockResolvedValueOnce(localBooks)
    const { bibleService } = await importTauriBibleService()

    await expect(bibleService.getBooks()).resolves.toEqual(localBooks)
  })
})
