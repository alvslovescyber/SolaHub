import { ref, shallowRef, computed } from 'vue'
import { defineStore } from 'pinia'
import { bibleService } from '@/services/bible.service'
import type { BookInfo, BibleChapter, VerseResult } from '@/types/bible.types'

export const useBibleStore = defineStore('bible', () => {
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
    try {
      books.value = await bibleService.getBooks()
    } finally {
      isLoadingBooks.value = false
    }
  }

  async function loadChapter(book: string, chapter: number): Promise<void> {
    selectedBook.value = book
    selectedChapter.value = chapter
    selectedVerse.value = null

    isLoadingChapter.value = true
    try {
      currentChapter.value = await bibleService.getChapter(book, chapter)
    } finally {
      isLoadingChapter.value = false
    }
  }

  async function search(query: string): Promise<void> {
    searchQuery.value = query
    if (!query.trim()) {
      searchResults.value = []
      return
    }

    isLoadingSearch.value = true
    try {
      searchResults.value = await bibleService.search(query)
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
    currentVerseRef,
    currentBook,
    loadBooks,
    loadChapter,
    search,
    selectVerse,
    navigateTo,
  }
})
