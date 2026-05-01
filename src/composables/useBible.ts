import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBibleStore } from '@/stores/bible.store'

export function useBible() {
  const store = useBibleStore()
  const {
    books,
    currentChapter,
    searchResults,
    selectedBook,
    selectedChapter,
    selectedVerse,
    searchQuery,
    currentVerseRef,
    currentBook,
    isLoadingChapter,
    isLoadingSearch,
  } = storeToRefs(store)

  onMounted(() => {
    void store.loadBooks()
  })

  return {
    books,
    currentChapter,
    searchResults,
    selectedBook,
    selectedChapter,
    selectedVerse,
    searchQuery,
    currentVerseRef,
    currentBook,
    isLoadingChapter,
    isLoadingSearch,
    loadChapter: store.loadChapter,
    search: store.search,
    selectVerse: store.selectVerse,
    navigateTo: store.navigateTo,
  }
}
