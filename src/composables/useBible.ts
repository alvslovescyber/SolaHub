import { onMounted } from 'vue'
import { useBibleStore } from '@/stores/bible.store'

export function useBible() {
  const store = useBibleStore()

  onMounted(() => {
    void store.loadBooks()
  })

  return {
    books: store.books,
    currentChapter: store.currentChapter,
    searchResults: store.searchResults,
    selectedBook: store.selectedBook,
    selectedChapter: store.selectedChapter,
    selectedVerse: store.selectedVerse,
    searchQuery: store.searchQuery,
    currentVerseRef: store.currentVerseRef,
    currentBook: store.currentBook,
    isLoadingChapter: store.isLoadingChapter,
    isLoadingSearch: store.isLoadingSearch,
    loadChapter: store.loadChapter,
    search: store.search,
    selectVerse: store.selectVerse,
    navigateTo: store.navigateTo,
  }
}
