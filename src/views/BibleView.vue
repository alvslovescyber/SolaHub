<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { ChevronLeft, ChevronRight, Search, BookOpenText, X } from 'lucide-vue-next'
  import { useBible } from '@/composables/useBible'
  import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import { useVerseAnnotationsStore } from '@/stores/verseAnnotations.store'
  import { CANONICAL_BOOKS } from '@/services/bible.service'
  import { resolveBookShortCode } from '@/lib/bibleReference'
  import {
    SButton,
    SContextMenu,
    SDropdownMenu,
    SIconButton,
    SInput,
    SModal,
    SSpinner,
    STextarea,
    STopBar,
  } from '@/components/s'
  import type { VerseResult } from '@/types/bible.types'

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
    isLoadingBooks,
    chapterError,
    searchError,
    booksError,
    loadBooks,
    loadChapter,
    search,
    selectVerse,
  } = useBible()

  const biblePrefs = useBiblePreferencesStore()
  const annotations = useVerseAnnotationsStore()
  const { highlights: verseHighlights } = storeToRefs(annotations)
  const { isCompact } = useResponsiveLayout()
  const searchInput = ref('')
  const showSearch = ref(false)
  const showBookList = ref(true)

  // ── Context menu state ────────────────────────────────────────────────────────
  const ctxMenu = ref<{
    visible: boolean
    x: number
    y: number
    verse: VerseResult | null
  }>({ visible: false, x: 0, y: 0, verse: null })

  // ── Note modal state ──────────────────────────────────────────────────────────
  const noteModal = ref({ open: false, verse: null as VerseResult | null, text: '' })

  // ── Highlight colour map ──────────────────────────────────────────────────────
  const HIGHLIGHT_BG: Record<string, string> = {
    yellow: 'rgba(250, 204, 21, 0.30)',
    green: 'rgba(74, 222, 128, 0.30)',
    blue: 'rgba(96, 165, 250, 0.30)',
    pink: 'rgba(244, 114, 182, 0.30)',
    purple: 'rgba(167, 139, 250, 0.30)',
  }

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

  const bookFilter = ref('')

  const filteredGroupedBooks = computed(() => {
    const q = bookFilter.value.trim().toLowerCase()
    const filterGroup = (arr: typeof books.value) =>
      q ? arr.filter((b) => b.longName.toLowerCase().includes(q)) : arr
    const OT = filterGroup(books.value.filter((b) => b.testament === 'OT'))
    const NT = filterGroup(books.value.filter((b) => b.testament === 'NT'))
    const result: Record<string, typeof OT> = {}
    if (OT.length) result['OT'] = OT
    if (NT.length) result['NT'] = NT
    return result
  })

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

  // ── Verse context menu ────────────────────────────────────────────────────────

  function openContextMenu(event: MouseEvent, verse: VerseResult) {
    event.preventDefault()
    ctxMenu.value = { visible: true, x: event.clientX, y: event.clientY, verse }
  }

  function closeContextMenu() {
    ctxMenu.value = { ...ctxMenu.value, visible: false, verse: null }
  }

  function onHighlight(colorId: string) {
    if (!ctxMenu.value.verse) return
    const v = ctxMenu.value.verse
    const key = annotations.verseKey(v.book, v.chapter, v.verse)
    const current = annotations.highlights[key]
    annotations.setHighlight(key, current === colorId ? '' : colorId)
    closeContextMenu()
  }

  function onClearHighlight() {
    if (!ctxMenu.value.verse) return
    const v = ctxMenu.value.verse
    annotations.setHighlight(annotations.verseKey(v.book, v.chapter, v.verse), '')
    closeContextMenu()
  }

  function onOpenNote() {
    if (!ctxMenu.value.verse) return
    const v = ctxMenu.value.verse
    const key = annotations.verseKey(v.book, v.chapter, v.verse)
    noteModal.value = { open: true, verse: v, text: annotations.notes[key] ?? '' }
    closeContextMenu()
  }

  function onSaveVerse() {
    if (!ctxMenu.value.verse) return
    annotations.saveVerse(ctxMenu.value.verse)
    closeContextMenu()
  }

  function saveNote() {
    if (!noteModal.value.verse) return
    const v = noteModal.value.verse
    annotations.setNote(annotations.verseKey(v.book, v.chapter, v.verse), noteModal.value.text)
    noteModal.value.open = false
  }

  function verseHighlightStyle(verse: VerseResult): Record<string, string> {
    const key = annotations.verseKey(verse.book, verse.chapter, verse.verse)
    const colorId = verseHighlights.value[key]
    if (!colorId || !HIGHLIGHT_BG[colorId]) return {}
    return { backgroundColor: HIGHLIGHT_BG[colorId], borderRadius: '3px', padding: '0 2px' }
  }

  function verseCurrentHighlight(verse: VerseResult): string | undefined {
    const key = annotations.verseKey(verse.book, verse.chapter, verse.verse)
    return verseHighlights.value[key]
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
                  class="flex-1 !px-2"
                  :class="biblePrefs.readerLineHeight === 'compact' && 'ring-2 ring-brand-500/40'"
                  @click="biblePrefs.setReaderLineHeight('compact')"
                >
                  Compact
                </SButton>
                <SButton
                  size="sm"
                  variant="secondary"
                  class="flex-1 !px-2"
                  :class="biblePrefs.readerLineHeight === 'normal' && 'ring-2 ring-brand-500/40'"
                  @click="biblePrefs.setReaderLineHeight('normal')"
                >
                  Normal
                </SButton>
                <SButton
                  size="sm"
                  variant="secondary"
                  class="flex-1 !px-2"
                  :class="biblePrefs.readerLineHeight === 'relaxed' && 'ring-2 ring-brand-500/40'"
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
                <SButton
                  size="sm"
                  variant="secondary"
                  class="flex-1 !px-2"
                  :class="biblePrefs.readerPaper === 'white' && 'ring-2 ring-brand-500/40'"
                  @click="biblePrefs.setReaderPaper('white')"
                >
                  White
                </SButton>
                <SButton
                  size="sm"
                  variant="secondary"
                  class="flex-1 !px-2"
                  :class="biblePrefs.readerPaper === 'sepia' && 'ring-2 ring-brand-500/40'"
                  @click="biblePrefs.setReaderPaper('sepia')"
                >
                  Sepia
                </SButton>
                <SButton
                  size="sm"
                  variant="secondary"
                  class="flex-1 !px-2"
                  :class="biblePrefs.readerPaper === 'muted' && 'ring-2 ring-brand-500/40'"
                  @click="biblePrefs.setReaderPaper('muted')"
                >
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
          <!-- Fixed header — not sticky (aside doesn't scroll) -->
          <div class="px-3 pt-2.5 pb-2 border-b border-line-subtle shrink-0 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <p class="text-2xs font-medium uppercase tracking-wider text-ink-subtle">
                Books · {{ books.length }}
              </p>
              <SIconButton v-if="isCompact" label="Hide" size="xs" @click="showBookList = false">
                <X class="h-3.5 w-3.5" />
              </SIconButton>
            </div>
            <!-- Book filter -->
            <div class="relative">
              <Search
                class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-ink-subtle"
              />
              <input
                v-model="bookFilter"
                type="text"
                class="w-full rounded-md bg-surface-canvas pl-6 pr-2 py-1 text-[12px] text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-brand-500/40 transition-shadow"
                placeholder="Search books…"
              />
            </div>
          </div>
          <!-- Scrollable book list — section headers are inline (no sticky) -->
          <div class="flex-1 overflow-y-auto py-1">
            <div v-if="isLoadingBooks" class="flex justify-center py-5">
              <SSpinner size="sm" />
            </div>
            <div v-else-if="booksError" class="px-3 py-4 text-xs text-ink-muted">
              <p class="leading-snug">{{ booksError }}</p>
              <SButton size="sm" variant="secondary" class="mt-3" @click="loadBooks">
                Retry
              </SButton>
            </div>
            <div v-else-if="books.length === 0" class="px-3 py-4 text-xs text-ink-muted">
              <p>No Bible books available.</p>
              <SButton size="sm" variant="secondary" class="mt-3" @click="loadBooks">
                Retry
              </SButton>
            </div>
            <template v-else>
              <template v-for="(group, label) in filteredGroupedBooks" :key="label">
                <p
                  class="px-3 pt-2.5 pb-0.5 text-2xs font-medium uppercase tracking-wider text-ink-subtle"
                >
                  {{ label === 'OT' ? 'Old Testament' : 'New Testament' }}
                </p>
                <button
                  v-for="book in group"
                  :key="book.shortName"
                  :class="[
                    'group flex items-center justify-between w-full text-left px-3 py-1.5 text-[13px] font-normal font-sans transition-colors rounded-md mx-1',
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
            :disabled="!canPrevChapter || isLoadingChapter"
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
            :disabled="!canNextChapter || isLoadingChapter"
            @click="nextChapter"
          >
            <ChevronRight class="h-4 w-4" />
          </SIconButton>
        </div>

        <div class="flex-1 overflow-y-auto bg-surface-base">
          <div v-if="isLoadingChapter" class="flex justify-center pt-16">
            <SSpinner />
          </div>

          <div
            v-else-if="chapterError"
            class="mx-auto flex max-w-md flex-col items-center px-8 pt-16 text-center"
          >
            <p class="text-sm text-ink-muted leading-relaxed">{{ chapterError }}</p>
            <SButton
              size="sm"
              variant="secondary"
              class="mt-4"
              @click="loadChapter(selectedBook, selectedChapter)"
            >
              Retry
            </SButton>
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
                :style="verseHighlightStyle(verse)"
                @click="selectVerse(verse.verse)"
                @contextmenu.prevent="openContextMenu($event, verse)"
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

    <!-- Verse context menu -->
    <SContextMenu
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :verse="ctxMenu.verse"
      :current-highlight="ctxMenu.verse ? verseCurrentHighlight(ctxMenu.verse) : undefined"
      @highlight="onHighlight"
      @clear-highlight="onClearHighlight"
      @note="onOpenNote"
      @save="onSaveVerse"
      @close="closeContextMenu"
    />

    <!-- Note modal -->
    <SModal
      :open="noteModal.open"
      :title="
        noteModal.verse
          ? `Note — ${noteModal.verse.book} ${noteModal.verse.chapter}:${noteModal.verse.verse}`
          : 'Note'
      "
      size="sm"
      @close="noteModal.open = false"
    >
      <div class="space-y-3">
        <p
          v-if="noteModal.verse"
          class="text-sm text-ink-muted italic leading-relaxed border-l-2 border-brand-300 pl-3"
        >
          {{ noteModal.verse.text }}
        </p>
        <STextarea
          v-model="noteModal.text"
          placeholder="Write your reflection or note here…"
          :rows="4"
          autoresize
        />
      </div>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="noteModal.open = false"> Cancel </SButton>
        <SButton size="sm" @click="saveNote"> Save note </SButton>
      </template>
    </SModal>
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
