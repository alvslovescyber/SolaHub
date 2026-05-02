<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { ChevronLeft, ChevronRight, Search, BookOpenText, X } from 'lucide-vue-next'
  import { useBible } from '@/composables/useBible'
  import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
  import { SIconButton, SInput, SSpinner, STopBar } from '@/components/s'

  const {
    books,
    currentChapter,
    searchResults,
    selectedBook,
    selectedChapter,
    selectedVerse,
    currentBook,
    isLoadingChapter,
    isLoadingSearch,
    loadChapter,
    search,
    selectVerse,
  } = useBible()

  const { isCompact } = useResponsiveLayout()
  const searchInput = ref('')
  const showSearch = ref(false)
  const showBookList = ref(true)

  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  function onSearchInput() {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => void search(searchInput.value), 250)
  }

  onBeforeUnmount(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
      searchTimeout = null
    }
  })

  const groupedBooks = computed(() => ({
    OT: books.value.filter((b) => b.testament === 'OT'),
    NT: books.value.filter((b) => b.testament === 'NT'),
  }))

  const canPrevChapter = computed(() => selectedChapter.value > 1)
  const canNextChapter = computed(() =>
    currentBook.value ? selectedChapter.value < currentBook.value.chapters : false
  )

  function prevChapter() {
    if (canPrevChapter.value) void loadChapter(selectedBook.value, selectedChapter.value - 1)
  }
  function nextChapter() {
    if (canNextChapter.value) void loadChapter(selectedBook.value, selectedChapter.value + 1)
  }

  watch(
    books,
    (b) => {
      if (b.length > 0 && !currentChapter.value) void loadChapter('GEN', 1)
    },
    { immediate: true }
  )

  // On compact widths, hide the book list by default
  watch(isCompact, (compact) => (showBookList.value = !compact), { immediate: true })

  function pickChapter(short: string, chapter: number) {
    void loadChapter(short, chapter)
    if (isCompact.value) showBookList.value = false
  }

  function jumpToSearchResult(book: string, chapter: number) {
    void loadChapter(book, chapter)
    showSearch.value = false
  }
</script>

<template>
  <div class="flex flex-1 min-w-0 flex-col">
    <STopBar
      title="Bible"
      :subtitle="currentBook?.longName ?? 'Read, search, and highlight Scripture'"
    >
      <template #actions>
        <SIconButton
          v-if="isCompact"
          label="Toggle book list"
          size="sm"
          @click="showBookList = !showBookList"
        >
          <BookOpenText class="h-4 w-4" />
        </SIconButton>
        <SIconButton label="Search Bible" size="sm" @click="showSearch = !showSearch">
          <Search class="h-4 w-4" />
        </SIconButton>
      </template>
    </STopBar>

    <div class="flex flex-1 min-h-0">
      <!-- Book list rail -->
      <Transition name="rail">
        <aside
          v-if="showBookList"
          class="w-52 shrink-0 border-r border-line-subtle bg-surface-base/60 backdrop-blur-xl overflow-hidden flex flex-col"
        >
          <header
            class="px-3 py-2.5 border-b border-line-subtle flex items-center justify-between sticky top-0"
          >
            <p class="text-2xs font-semibold uppercase tracking-wider text-ink-subtle">
              Books · {{ books.length }}
            </p>
            <SIconButton v-if="isCompact" label="Hide" size="xs" @click="showBookList = false">
              <X class="h-3.5 w-3.5" />
            </SIconButton>
          </header>
          <div class="flex-1 overflow-y-auto py-2">
            <template v-for="(group, label) in groupedBooks" :key="label">
              <p
                class="sticky top-0 z-10 px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-subtle bg-surface-base/85 backdrop-blur"
              >
                {{ label === 'OT' ? 'Old Testament' : 'New Testament' }}
              </p>
              <button
                v-for="book in group"
                :key="book.shortName"
                :class="[
                  'group flex items-center justify-between w-full text-left px-3 py-1.5 text-sm transition-colors',
                  selectedBook === book.shortName
                    ? 's-sidebar-item-active mx-1.5 my-0.5 rounded-md'
                    : 'text-ink hover:bg-surface-canvas',
                ]"
                @click="pickChapter(book.shortName, 1)"
              >
                <span class="truncate font-medium">{{ book.longName }}</span>
                <span
                  :class="[
                    'text-2xs',
                    selectedBook === book.shortName
                      ? 'text-brand-700 dark:text-brand-300'
                      : 'text-ink-subtle group-hover:text-ink-muted',
                  ]"
                  >{{ book.chapters }}</span
                >
              </button>
            </template>
          </div>
        </aside>
      </Transition>

      <!-- Reading pane -->
      <div class="flex flex-1 flex-col min-w-0">
        <!-- Search overlay -->
        <Transition name="fade">
          <div
            v-if="showSearch"
            class="border-b border-line-subtle bg-surface-base/80 backdrop-blur-xl px-6 py-3.5"
          >
            <SInput
              v-model="searchInput"
              size="sm"
              placeholder="Search across all of Scripture…"
              autofocus
              @input="onSearchInput"
            >
              <template #leading>
                <Search class="h-3.5 w-3.5" />
              </template>
              <template v-if="searchInput" #trailing>
                <button
                  type="button"
                  class="text-ink-muted hover:text-ink-strong"
                  aria-label="Clear search"
                  @click="searchInput = ''"
                >
                  <X class="h-3.5 w-3.5" />
                </button>
              </template>
            </SInput>

            <div v-if="isLoadingSearch" class="mt-3 flex justify-center">
              <SSpinner size="sm" />
            </div>

            <p
              v-else-if="searchInput && searchResults.length === 0"
              class="mt-3 text-sm text-ink-muted text-center"
            >
              No results for "{{ searchInput }}"
            </p>

            <div
              v-else-if="searchResults.length > 0"
              class="mt-3 space-y-1 max-h-72 overflow-y-auto"
            >
              <button
                v-for="(result, i) in searchResults"
                :key="i"
                class="w-full text-left p-2.5 rounded-md hover:bg-surface-canvas transition-colors"
                @click="jumpToSearchResult(result.book, result.chapter)"
              >
                <p
                  class="text-2xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300"
                >
                  {{ result.book }} {{ result.chapter }}:{{ result.verse }}
                </p>
                <p class="text-sm text-ink mt-0.5 line-clamp-2">
                  {{ result.text }}
                </p>
              </button>
            </div>
          </div>
        </Transition>

        <!-- Sticky chapter nav -->
        <div
          class="sticky top-0 z-10 flex items-center justify-between px-6 py-2.5 border-b border-line-subtle bg-surface-base/85 backdrop-blur-xl"
        >
          <SIconButton
            label="Previous chapter"
            size="sm"
            :disabled="!canPrevChapter"
            @click="prevChapter"
          >
            <ChevronLeft class="h-4 w-4" />
          </SIconButton>
          <span class="text-sm font-semibold text-ink-strong tracking-tight">
            {{ currentBook?.longName ?? selectedBook }} {{ selectedChapter }}
          </span>
          <SIconButton
            label="Next chapter"
            size="sm"
            :disabled="!canNextChapter"
            @click="nextChapter"
          >
            <ChevronRight class="h-4 w-4" />
          </SIconButton>
        </div>

        <!-- Reading area -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="isLoadingChapter" class="flex justify-center pt-16">
            <SSpinner />
          </div>

          <article v-else-if="currentChapter" class="bible-verse max-w-[640px] mx-auto px-8 py-10">
            <header class="mb-8 text-center">
              <p
                class="text-2xs font-semibold uppercase tracking-[0.2em] text-ink-subtle font-sans"
              >
                Chapter
              </p>
              <h1 class="mt-1 text-4xl font-serif font-semibold text-ink-strong tracking-tight">
                {{ selectedChapter }}
              </h1>
            </header>
            <p>
              <span
                v-for="verse in currentChapter.verses"
                :key="verse.verse"
                :class="[
                  'cursor-pointer rounded px-0.5 transition-colors',
                  'hover:bg-amber-50 dark:hover:bg-amber-500/10',
                  selectedVerse === verse.verse && 'verse-highlight',
                ]"
                @click="selectVerse(verse.verse)"
              >
                <sup>{{ verse.verse }}</sup
                >{{ verse.text }}{{ ' ' }}
              </span>
            </p>
          </article>

          <div v-else class="text-center text-ink-muted pt-16 text-sm">
            Choose a book of Scripture to begin reading
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .rail-enter-active,
  .rail-leave-active {
    transition:
      width 200ms ease,
      opacity 200ms ease;
    overflow: hidden;
  }
  .rail-enter-from,
  .rail-leave-to {
    width: 0;
    opacity: 0;
  }
</style>
