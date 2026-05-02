<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { ChevronLeft, ChevronRight, Search, BookOpenText, X } from 'lucide-vue-next'
  import { useBible } from '@/composables/useBible'
  import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import { CANONICAL_BOOKS } from '@/services/bible.service'
  import { resolveBookShortCode } from '@/lib/bibleReference'
  import { SIconButton, SInput, SSpinner, STopBar, SDropdownMenu, SButton } from '@/components/s'

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
    searchError,
    loadChapter,
    search,
    selectVerse,
  } = useBible()

  const biblePrefs = useBiblePreferencesStore()
  const { isCompact } = useResponsiveLayout()
  const searchInput = ref('')
  const showSearch = ref(false)
  const showBookList = ref(true)

  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  function onSearchInput() {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => void search(searchInput.value), 250)
  }

  function clearSearchField() {
    searchInput.value = ''
    void search('')
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

  watch(isCompact, (compact) => (showBookList.value = !compact), { immediate: true })

  function pickChapter(short: string, chapter: number) {
    void loadChapter(short, chapter)
    if (isCompact.value) showBookList.value = false
  }

  async function jumpToSearchResult(book: string, chapter: number, verse?: number) {
    const catalog = books.value.length > 0 ? books.value : CANONICAL_BOOKS
    const code = resolveBookShortCode(book, catalog)
    if (!code) return
    await loadChapter(code, chapter)
    if (typeof verse === 'number') selectVerse(verse)
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
        <SDropdownMenu placement="bottom-end">
          <template #trigger>
            <SIconButton label="Reading appearance" size="sm">
              <span class="text-[12px] font-medium tracking-tight px-0.5 font-sans">Aa</span>
            </SIconButton>
          </template>
          <div class="w-56 p-3 space-y-3" @click.stop>
            <div>
              <p class="text-2xs font-medium uppercase tracking-wide text-ink-subtle mb-1.5">
                Text size
              </p>
              <div class="flex gap-1">
                <SButton
                  size="sm"
                  variant="secondary"
                  class="flex-1 !px-2"
                  :class="biblePrefs.readerFontScale === 's' && 'ring-2 ring-brand-500/40'"
                  @click="biblePrefs.setReaderFontScale('s')"
                >
                  Small
                </SButton>
                <SButton
                  size="sm"
                  variant="secondary"
                  class="flex-1 !px-2"
                  :class="biblePrefs.readerFontScale === 'm' && 'ring-2 ring-brand-500/40'"
                  @click="biblePrefs.setReaderFontScale('m')"
                >
                  Medium
                </SButton>
                <SButton
                  size="sm"
                  variant="secondary"
                  class="flex-1 !px-2"
                  :class="biblePrefs.readerFontScale === 'l' && 'ring-2 ring-brand-500/40'"
                  @click="biblePrefs.setReaderFontScale('l')"
                >
                  Large
                </SButton>
              </div>
            </div>
            <div>
              <p class="text-2xs font-medium uppercase tracking-wide text-ink-subtle mb-1.5">
                Line spacing
              </p>
              <div class="flex gap-1 flex-wrap">
                <SButton
                  size="sm"
                  variant="secondary"
                  @click="biblePrefs.setReaderLineHeight('compact')"
                >
                  Compact
                </SButton>
                <SButton
                  size="sm"
                  variant="secondary"
                  @click="biblePrefs.setReaderLineHeight('normal')"
                >
                  Normal
                </SButton>
                <SButton
                  size="sm"
                  variant="secondary"
                  @click="biblePrefs.setReaderLineHeight('relaxed')"
                >
                  Relaxed
                </SButton>
              </div>
            </div>
            <div>
              <p class="text-2xs font-medium uppercase tracking-wide text-ink-subtle mb-1.5">
                Background
              </p>
              <div class="flex gap-1 flex-wrap">
                <SButton size="sm" variant="secondary" @click="biblePrefs.setReaderPaper('white')">
                  White
                </SButton>
                <SButton size="sm" variant="secondary" @click="biblePrefs.setReaderPaper('sepia')">
                  Sepia
                </SButton>
                <SButton size="sm" variant="secondary" @click="biblePrefs.setReaderPaper('muted')">
                  Soft grey
                </SButton>
              </div>
            </div>
          </div>
        </SDropdownMenu>
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
      <Transition name="rail">
        <aside
          v-if="showBookList"
          class="w-52 shrink-0 border-r border-line-subtle bg-surface-base/60 backdrop-blur-xl overflow-hidden flex flex-col"
        >
          <header
            class="px-3 py-2.5 border-b border-line-subtle flex items-center justify-between sticky top-0"
          >
            <p class="text-2xs font-medium uppercase tracking-wider text-ink-subtle">
              Books · {{ books.length }}
            </p>
            <SIconButton v-if="isCompact" label="Hide" size="xs" @click="showBookList = false">
              <X class="h-3.5 w-3.5" />
            </SIconButton>
          </header>
          <div class="flex-1 overflow-y-auto py-2">
            <template v-for="(group, label) in groupedBooks" :key="label">
              <p
                class="sticky top-0 z-10 px-3 py-1.5 text-2xs font-medium uppercase tracking-wider text-ink-subtle bg-surface-base/85 backdrop-blur"
              >
                {{ label === 'OT' ? 'Old Testament' : 'New Testament' }}
              </p>
              <button
                v-for="book in group"
                :key="book.shortName"
                :class="[
                  'group flex items-center justify-between w-full text-left px-3 py-1.5 text-[13px] font-normal transition-colors rounded-md mx-1',
                  selectedBook === book.shortName
                    ? 'text-brand-600 bg-brand-500/[0.06]'
                    : 'text-ink hover:bg-surface-canvas',
                ]"
                @click="pickChapter(book.shortName, 1)"
              >
                <span class="truncate">{{ book.longName }}</span>
                <span
                  :class="[
                    'text-2xs',
                    selectedBook === book.shortName
                      ? 'text-brand-600'
                      : 'text-ink-subtle group-hover:text-ink-muted',
                  ]"
                  >{{ book.chapters }}</span
                >
              </button>
            </template>
          </div>
        </aside>
      </Transition>

      <div class="flex flex-1 flex-col min-w-0">
        <Transition name="fade">
          <div
            v-if="showSearch"
            class="border-b border-line-subtle bg-surface-base/80 backdrop-blur-xl px-6 py-3.5"
          >
            <SInput
              v-model="searchInput"
              size="sm"
              placeholder="Try John 3:16, Psalm 23, or keywords in this chapter…"
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
                  @click="clearSearchField"
                >
                  <X class="h-3.5 w-3.5" />
                </button>
              </template>
            </SInput>

            <div v-if="isLoadingSearch" class="mt-3 flex justify-center">
              <SSpinner size="sm" />
            </div>

            <p
              v-else-if="searchError && searchInput"
              class="mt-3 text-sm text-amber-700 dark:text-amber-300 text-center leading-snug"
            >
              {{ searchError }}
            </p>

            <p
              v-else-if="searchInput && searchResults.length === 0 && !searchError"
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
                type="button"
                @click="jumpToSearchResult(result.book, result.chapter, result.verse)"
              >
                <p
                  class="text-2xs font-medium uppercase tracking-wider text-brand-700 dark:text-brand-300"
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
          <span class="text-sm font-medium text-ink-strong tracking-tight">
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

        <div class="flex-1 overflow-y-auto bg-surface-base">
          <div v-if="isLoadingChapter" class="flex justify-center pt-16">
            <SSpinner />
          </div>

          <article
            v-else-if="currentChapter"
            :class="[
              'bible-verse max-w-[640px] mx-auto px-8 py-10 rounded-xl transition-colors',
              biblePrefs.readerFontClass,
              biblePrefs.readerLeadingClass,
              biblePrefs.readerPaperClass,
            ]"
          >
            <header class="mb-8 text-center">
              <p class="text-2xs font-medium uppercase tracking-[0.2em] text-ink-subtle font-sans">
                Chapter
              </p>
              <h1 class="mt-1 text-4xl font-serif font-medium text-ink-strong tracking-tight">
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
