<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useBible } from '@/composables/useBible'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSpinner from '@/components/ui/AppSpinner.vue'
import AppButton from '@/components/ui/AppButton.vue'

const {
  books,
  currentChapter,
  searchResults,
  selectedBook,
  selectedChapter,
  selectedVerse,
  searchQuery,
  currentBook,
  isLoadingChapter,
  isLoadingSearch,
  loadChapter,
  search,
  selectVerse,
} = useBible()

const searchInput = ref('')
const showSearch = ref(false)

let searchTimeout: ReturnType<typeof setTimeout>

function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    void search(searchInput.value)
  }, 300)
}

const canPrevChapter = computed(() => selectedChapter.value > 1)
const canNextChapter = computed(
  () => currentBook.value ? selectedChapter.value < currentBook.value.chapters : false,
)

function prevChapter() {
  if (canPrevChapter.value) void loadChapter(selectedBook.value, selectedChapter.value - 1)
}

function nextChapter() {
  if (canNextChapter.value) void loadChapter(selectedBook.value, selectedChapter.value + 1)
}

// Load Genesis 1 on mount if nothing selected
watch(books, (b) => {
  if (b.length > 0 && !currentChapter.value) {
    void loadChapter('GEN', 1)
  }
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <AppPageHeader title="Bible" subtitle="Search and read Scripture">
      <template #actions>
        <AppButton variant="ghost" size="sm" @click="showSearch = !showSearch">
          <Search class="h-4 w-4" />
          Search
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="flex-1 flex overflow-hidden">
      <!-- Book list -->
      <div class="w-40 shrink-0 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
        <div class="p-2 space-y-0.5">
          <button
            v-for="book in books"
            :key="book.shortName"
            :class="[
              'w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              selectedBook === book.shortName
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
            ]"
            @click="loadChapter(book.shortName, 1)"
          >
            {{ book.longName }}
          </button>
        </div>
      </div>

      <!-- Main content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Search overlay -->
        <Transition name="fade">
          <div v-if="showSearch" class="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <AppInput
              v-model="searchInput"
              placeholder="Search Bible (e.g. 'love one another')..."
              @input="onSearchInput"
            />

            <div v-if="isLoadingSearch" class="mt-3 flex justify-center">
              <AppSpinner size="sm" />
            </div>

            <div v-else-if="searchResults.length > 0" class="mt-3 space-y-1 max-h-64 overflow-y-auto">
              <button
                v-for="(result, i) in searchResults"
                :key="i"
                class="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                @click="loadChapter(result.book, result.chapter); showSearch = false"
              >
                <p class="text-xs font-semibold text-primary-600 mb-0.5">
                  {{ result.book }} {{ result.chapter }}:{{ result.verse }}
                </p>
                <p class="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{{ result.text }}</p>
              </button>
            </div>
          </div>
        </Transition>

        <!-- Chapter navigation -->
        <div class="flex items-center justify-between px-6 py-2 border-b border-slate-200 dark:border-slate-700 text-sm">
          <button
            :disabled="!canPrevChapter"
            class="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            @click="prevChapter"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>

          <span class="font-semibold text-slate-700 dark:text-slate-300">
            {{ currentBook?.longName ?? selectedBook }} {{ selectedChapter }}
          </span>

          <button
            :disabled="!canNextChapter"
            class="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            @click="nextChapter"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>

        <!-- Bible text -->
        <div class="flex-1 overflow-y-auto px-8 py-6">
          <div v-if="isLoadingChapter" class="flex justify-center pt-8">
            <AppSpinner />
          </div>

          <div v-else-if="currentChapter" class="bible-verse max-w-2xl mx-auto">
            <span
              v-for="verse in currentChapter.verses"
              :key="verse.verse"
              :class="[
                'cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/10 rounded px-0.5 transition-colors',
                selectedVerse === verse.verse && 'verse-highlight',
              ]"
              @click="selectVerse(verse.verse)"
            >
              <sup>{{ verse.verse }}</sup>{{ verse.text }}
              {{ ' ' }}
            </span>
          </div>

          <div v-else class="text-center text-slate-400 pt-16">
            Select a book to start reading
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
