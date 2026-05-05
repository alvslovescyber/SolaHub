import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { VerseResult } from '@/types/bible.types'

const searchMock = vi.fn()
const getVerseMock = vi.fn()
const getChapterMock = vi.fn()
const getBooksMock = vi.fn()

async function importTauriBibleStore() {
  vi.resetModules()
  vi.doMock('@/lib/platform', () => ({
    isTauri: true,
    isMac: false,
    modKeyLabel: 'Ctrl',
  }))
  vi.doMock('@/services/bible.service', () => ({
    CANONICAL_BOOKS: [{ shortName: 'JHN', longName: 'John', chapters: 21, testament: 'NT' }],
    bibleService: {
      search: searchMock,
      getVerse: getVerseMock,
      getChapter: getChapterMock,
      getBooks: getBooksMock,
    },
  }))

  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  return import('../bible.store')
}

describe('bible store', () => {
  beforeEach(() => {
    searchMock.mockReset()
    getVerseMock.mockReset()
    getChapterMock.mockReset()
    getBooksMock.mockReset()
  })

  it('falls back to reference lookup when Tauri full-text search has no local results', async () => {
    const verse: VerseResult = {
      book: 'John',
      chapter: 3,
      verse: 16,
      text: 'For God so loved the world',
    }
    searchMock.mockResolvedValueOnce([])
    getVerseMock.mockResolvedValueOnce(verse)

    const { useBibleStore } = await importTauriBibleStore()
    const store = useBibleStore()
    await store.search('John 3:16')

    expect(searchMock).toHaveBeenCalledWith('John 3:16', 'KJV')
    expect(getVerseMock).toHaveBeenCalledWith('JHN', 3, 16, 'KJV')
    expect(store.searchResults).toEqual([verse])
    expect(store.searchError).toBeNull()
  })
})
