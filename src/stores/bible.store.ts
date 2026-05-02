import { ref, shallowRef, computed } from 'vue'
import { defineStore } from 'pinia'
import { parseVerseReference } from '@/lib/bibleReference'
import { isTauri } from '@/lib/platform'
import { bibleService, CANONICAL_BOOKS } from '@/services/bible.service'
import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
import type { BookInfo, BibleChapter, VerseResult } from '@/types/bible.types'

export const useBibleStore = defineStore('bible', () => {
  let chapterLoadGeneration = 0
  let chapterLoadAbort: AbortController | null = null
  // Use shallowRef for large collections — avoids deep reactivity overhead
  const books = shallowRef<BookInfo[]>([])
  const currentChapter = shallowRef<BibleChapter | null>(null)
  const searchResults = shallowRef<VerseResult[]>([])

  const selectedBook = ref<string>('GEN')
  const selectedChapter = ref<number>(1)
  const selectedVerse = ref<number | null>(null)
  const searchQuery = ref('')

  const isLoadingChapter = ref(false)
  const isLoadingSearch = ref(false)
  const isLoadingBooks = ref(false)

  const chapterError = ref<string | null>(null)
  const searchError = ref<string | null>(null)
  const booksError = ref<string | null>(null)

  const currentVerseRef = computed(() => {
    if (!selectedVerse.value) return null
    return `${selectedBook.value}.${selectedChapter.value}.${selectedVerse.value}`
  })

  const currentBook = computed(
    () => books.value.find((b) => b.shortName === selectedBook.value) ?? null
  )

  async function loadBooks(): Promise<void> {
    if (books.value.length > 0) return // already cached
    isLoadingBooks.value = true
    booksError.value = null
    try {
      books.value = await bibleService.getBooks()
    } catch (e) {
      booksError.value = toMessage(e, 'Failed to load Bible books.')
      throw e
    } finally {
      isLoadingBooks.value = false
    }
  }

  async function loadChapter(book: string, chapter: number): Promise<void> {
    const generation = ++chapterLoadGeneration
    chapterLoadAbort?.abort()
    chapterLoadAbort = new AbortController()
    const signal = chapterLoadAbort.signal

    selectedBook.value = book
    selectedChapter.value = chapter
    selectedVerse.value = null

    isLoadingChapter.value = true
    chapterError.value = null
    try {
      const prefs = useBiblePreferencesStore()
      const translation = prefs.translationApiCode(prefs.defaultTranslationId)
      currentChapter.value = await bibleService.getChapter(book, chapter, translation, signal)
    } catch (e) {
      if (generation !== chapterLoadGeneration) return
      const aborted =
        signal.aborted ||
        (typeof DOMException !== 'undefined' &&
          e instanceof DOMException &&
          e.name === 'AbortError')
      if (aborted) return
      chapterError.value = toMessage(e, `Failed to load ${book} ${chapter}.`)
      throw e
    } finally {
      if (generation === chapterLoadGeneration) isLoadingChapter.value = false
    }
  }

  async function search(query: string): Promise<void> {
    searchQuery.value = query
    const q = query.trim()
    if (!q) {
      searchResults.value = []
      searchError.value = null
      return
    }

    isLoadingSearch.value = true
    searchError.value = null
    try {
      const prefs = useBiblePreferencesStore()
      const translation = prefs.translationApiCode(prefs.defaultTranslationId)

      if (isTauri) {
        searchResults.value = await bibleService.search(q, translation)
        return
      }

      const catalog: BookInfo[] = books.value.length > 0 ? books.value : CANONICAL_BOOKS
      const parsed = parseVerseReference(q, catalog)
      if (parsed) {
        if (typeof parsed.verse === 'number') {
          try {
            const v = await bibleService.getVerse(
              parsed.book,
              parsed.chapter,
              parsed.verse,
              translation
            )
            searchResults.value = [v]
          } catch {
            searchResults.value = []
            searchError.value =
              'That verse could not be found. Check the book, chapter, and verse for your translation.'
          }
          return
        }
        const ch = await bibleService.getChapter(parsed.book, parsed.chapter, translation)
        searchResults.value = ch.verses
        return
      }

      if (currentChapter.value) {
        const ql = q.toLowerCase()
        searchResults.value = currentChapter.value.verses.filter((v) =>
          v.text.toLowerCase().includes(ql)
        )
        if (searchResults.value.length === 0) {
          searchError.value =
            'No matches in this chapter. Try a reference like John 3:16, or different wording.'
        }
        return
      }

      searchResults.value = []
      searchError.value =
        'Enter a verse reference (for example John 3:16) or open a chapter to search its text.'
    } catch (e) {
      searchError.value = toMessage(e, 'Search failed. Please try again.')
      searchResults.value = []
    } finally {
      isLoadingSearch.value = false
    }
  }

  function selectVerse(verse: number): void {
    selectedVerse.value = verse
  }

  function navigateTo(book: string, chapter: number, verse?: number): void {
    void loadChapter(book, chapter)
    if (verse !== undefined) selectedVerse.value = verse
  }

  return {
    books,
    currentChapter,
    searchResults,
    selectedBook,
    selectedChapter,
    selectedVerse,
    searchQuery,
    isLoadingChapter,
    isLoadingSearch,
    isLoadingBooks,
    chapterError,
    searchError,
    booksError,
    currentVerseRef,
    currentBook,
    loadBooks,
    loadChapter,
    search,
    selectVerse,
    navigateTo,
  }
})

function toMessage(e: unknown, fallback: string): string {
  if (
    typeof e === 'object' &&
    e !== null &&
    'response' in e &&
    typeof (e as { response?: { data?: { description?: string } } }).response?.data?.description ===
      'string'
  ) {
    return (e as { response: { data: { description: string } } }).response.data.description
  }
  if (e instanceof Error && e.message) return e.message
  return fallback
}
