<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    EyeOff,
    Eye,
    Monitor,
    Music2,
    Plus,
    Search,
    Trash2,
    X,
  } from 'lucide-vue-next'
  import { usePresenterStore } from '@/stores/presenter.store'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import { useSongsStore } from '@/stores/songs.store'
  import { bibleService, CANONICAL_BOOKS } from '@/services/bible.service'
  import { catalogMeta } from '@/constants/bibleTranslations'
  import { usePresenterScale } from '@/composables/usePresenterScale'
  import { useDisplayMonitors } from '@/composables/useDisplayMonitors'
  import { isTauri } from '@/lib/platform'
  import {
    SButton,
    SEmptyState,
    SIconButton,
    SInput,
    SModal,
    SPresenterSlide,
    SSpinner,
    STextarea,
    STopBar,
    useSToast,
  } from '@/components/s'
  import type { ScriptureSlide, SongSlide } from '@/types/presenter.types'
  import type { Song, SongSection } from '@/stores/songs.store'

  const presenter = usePresenterStore()
  const biblePrefs = useBiblePreferencesStore()
  const songs = useSongsStore()
  const toast = useSToast()

  // ── Scale-transform preview ───────────────────────────────────────────────────
  const previewContainerRef = ref<HTMLElement | null>(null)
  const overlayRef = ref<HTMLElement | null>(null)
  const verseListRef = ref<HTMLElement | null>(null)
  const { scale, refW, refH } = usePresenterScale(previewContainerRef)

  // ── Monitor detection ─────────────────────────────────────────────────────────
  const { monitors, selectedMonitorIndex, loading: monitorsLoading } = useDisplayMonitors()

  // ── Library tabs ──────────────────────────────────────────────────────────────
  type LibraryTab = 'scripture' | 'songs'
  const activeTab = ref<LibraryTab>('scripture')

  // ── Scripture browser — 3-level drill-down: books → chapters → verses ─────────
  type BrowserView = 'books' | 'chapters' | 'verses'
  const browserView = ref<BrowserView>('books')
  const bookSearch = ref('')
  const browsingBook = ref<(typeof CANONICAL_BOOKS)[0] | null>(null)
  const browsingChapter = ref<number | null>(null)
  const loadingChapter = ref(false)
  const loadedRef = ref('')
  const loadedChapterSlides = ref<ScriptureSlide[]>([])

  // Cancels any in-flight chapter fetch when a newer one starts or on unmount
  let loadAbortController: AbortController | null = null

  // True only when the current slide queue was loaded from this chapter
  const isQueuedChapter = computed(() => {
    if (!loadedChapterSlides.value.length || !presenter.session.slides.length) return false
    return presenter.session.slides[0]?.verseRef === loadedChapterSlides.value[0]?.verseRef
  })

  const filteredBooks = computed(() => {
    const q = bookSearch.value.toLowerCase().trim()
    if (!q) return CANONICAL_BOOKS
    return CANONICAL_BOOKS.filter((b) => b.longName.toLowerCase().includes(q))
  })

  const filteredOT = computed(() => filteredBooks.value.filter((b) => b.testament === 'OT'))
  const filteredNT = computed(() => filteredBooks.value.filter((b) => b.testament === 'NT'))

  const chapterRange = computed(() =>
    browsingBook.value ? Array.from({ length: browsingBook.value.chapters }, (_, i) => i + 1) : []
  )

  async function loadScriptureChapter(book: (typeof CANONICAL_BOOKS)[0], chapterNum: number) {
    // Cancel any previous in-flight request to prevent stale results arriving late
    loadAbortController?.abort()
    loadAbortController = new AbortController()
    const { signal } = loadAbortController

    loadingChapter.value = true
    browsingChapter.value = chapterNum
    loadedChapterSlides.value = []
    try {
      const t = biblePrefs.translationApiCode(biblePrefs.effectivePresenterTranslationId())
      const chapter = await bibleService.getChapter(book.shortName, chapterNum, t, signal)
      if (signal.aborted) return

      const slides: ScriptureSlide[] = chapter.verses.map((v) => ({
        source: 'scripture' as const,
        verseRef: `${v.book}.${v.chapter}.${v.verse}`,
        text: v.text,
        book: v.book,
        chapter: v.chapter,
        verse: v.verse,
      }))
      presenter.loadSlides(slides)
      loadedChapterSlides.value = slides
      loadedRef.value = `${book.longName} ${chapterNum}`
      browserView.value = 'verses'
      toast.success('Chapter loaded', `${book.longName} ${chapterNum} ready to present`)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      // Reset drill-down state so user can retry from the chapter grid
      browsingChapter.value = null
      browserView.value = 'chapters'
      const msg = e instanceof Error ? e.message : 'Try another translation in Settings.'
      toast.error('Could not load chapter', msg)
    } finally {
      if (!signal.aborted) loadingChapter.value = false
    }
  }

  function selectBook(book: (typeof CANONICAL_BOOKS)[0]) {
    browsingBook.value = book
    browserView.value = 'chapters'
  }

  function backToBooks() {
    browsingBook.value = null
    browsingChapter.value = null
    loadedChapterSlides.value = []
    browserView.value = 'books'
  }

  function backToChapters() {
    browsingChapter.value = null
    loadedChapterSlides.value = []
    browserView.value = 'chapters'
  }

  // Auto-scroll verse list to the active verse when navigating from overlay keyboard
  watch(
    () => presenter.session.currentIndex,
    async (idx) => {
      if (!isQueuedChapter.value || browserView.value !== 'verses') return
      await nextTick()
      const el = verseListRef.value?.children[idx] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  )

  // ── Song loading ──────────────────────────────────────────────────────────────
  const songSearch = ref('')
  const filteredSongs = computed(() => {
    const q = songSearch.value.toLowerCase().trim()
    if (!q) return songs.allSongs
    return songs.allSongs.filter((s) => s.title.toLowerCase().includes(q))
  })

  function loadSong(song: Song) {
    const slides: SongSlide[] = song.sections.map((sec, i) => ({
      source: 'song' as const,
      verseRef: `song.${song.id}.${i}`,
      text: sec.text,
      songTitle: song.title,
      sectionLabel: sec.label,
    }))
    presenter.loadSlides(slides)
    toast.success('Song loaded', `${song.title} ready to present`)
  }

  // ── Add song modal ────────────────────────────────────────────────────────────
  const addSongModal = ref(false)
  const newSong = ref({
    title: '',
    author: '',
    sections: [{ type: 'verse', label: 'Verse 1', text: '' }],
  })

  function addSongSection() {
    const existing = newSong.value.sections
    const hasChorus = existing.some((s) => s.type === 'chorus')
    const hasBridge = existing.some((s) => s.type === 'bridge')
    const hasOutro = existing.some((s) => s.type === 'outro')
    const verseCount = existing.filter((s) => s.type === 'verse').length

    let type: SongSection['type']
    let label: string
    if (!hasChorus) {
      type = 'chorus'
      label = 'Chorus'
    } else if (verseCount < 3) {
      type = 'verse'
      label = `Verse ${verseCount + 1}`
    } else if (!hasBridge) {
      type = 'bridge'
      label = 'Bridge'
    } else if (!hasOutro) {
      type = 'outro'
      label = 'Outro'
    } else {
      type = 'verse'
      label = `Verse ${verseCount + 1}`
    }
    newSong.value.sections.push({ type, label, text: '' })
  }

  function removeSongSection(i: number) {
    newSong.value.sections.splice(i, 1)
  }

  function submitNewSong() {
    if (!newSong.value.title.trim()) return
    const sections = newSong.value.sections.filter((s) => s.text.trim())
    if (sections.length === 0) {
      toast.error('No lyrics added', 'Enter lyrics for at least one section before saving.')
      return
    }
    songs.addSong({
      title: newSong.value.title.trim(),
      author: newSong.value.author.trim() || undefined,
      sections,
    })
    addSongModal.value = false
    newSong.value = {
      title: '',
      author: '',
      sections: [{ type: 'verse', label: 'Verse 1', text: '' }],
    }
    toast.success('Song added', 'Your song has been added to the library.')
  }

  // ── Presenter state ───────────────────────────────────────────────────────────
  const slide = computed(() => presenter.currentSlide)
  const progress = computed(() => presenter.progress)
  const hasSlides = computed(() => presenter.session.slides.length > 0)

  const presenterTranslationHint = computed(() => {
    const id = biblePrefs.effectivePresenterTranslationId()
    return catalogMeta(id)?.name ?? id.toUpperCase()
  })

  // ── Fullscreen overlay ────────────────────────────────────────────────────────
  watch(
    () => presenter.session.overlayOpen,
    async (open) => {
      if (open) {
        await nextTick()
        try {
          await overlayRef.value?.requestFullscreen?.()
        } catch {
          /* fullscreen blocked */
        }
        // Re-focus after fullscreen transition takes control
        overlayRef.value?.focus()
      } else {
        if (document.fullscreenElement) await document.exitFullscreen?.()
      }
    }
  )

  function onFullscreenChange() {
    if (!document.fullscreenElement && presenter.session.overlayOpen) {
      presenter.closeOverlay()
    }
  }

  onMounted(() => document.addEventListener('fullscreenchange', onFullscreenChange))
  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    loadAbortController?.abort()
  })

  async function handleOpenDisplay() {
    if (!isTauri) {
      toast.info(
        'Opening in fullscreen mode',
        'Monitor selection is only available in the desktop app. Using fullscreen overlay.'
      )
    }
    await presenter.openDisplayWindow(selectedMonitorIndex.value)
  }

  async function handleCloseDisplay() {
    await presenter.closeDisplayWindow()
    if (document.fullscreenElement) await document.exitFullscreen?.()
  }

  // ── Settings options ──────────────────────────────────────────────────────────
  const BG_OPTIONS = [
    { value: 'black', label: 'Black', dot: '#000000' },
    { value: 'navy', label: 'Navy', dot: '#0f172a' },
    { value: 'gradient', label: 'Gradient', dot: 'linear-gradient(135deg, #1e293b, #000)' },
  ] as const

  const FONT_OPTIONS = [
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'large', label: 'Large' },
    { value: 'auditorium', label: 'Auditorium' },
  ] as const
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0 min-h-0">
    <!-- Top bar -->
    <STopBar
      title="Presenter"
      subtitle="Project Scripture and worship to the congregation"
      :show-bell="false"
    >
      <template #actions>
        <!-- Blank screen toggle (only in presenter mode) -->
        <SButton
          v-if="presenter.session.overlayOpen"
          :variant="presenter.isBlanked ? 'primary' : 'secondary'"
          size="sm"
          @click="presenter.toggleBlank()"
        >
          <template #leading>
            <EyeOff v-if="!presenter.isBlanked" class="h-3.5 w-3.5" />
            <Eye v-else class="h-3.5 w-3.5" />
          </template>
          {{ presenter.isBlanked ? 'Show slide' : 'Blank screen' }}
        </SButton>

        <SButton
          v-if="presenter.session.displayWindowOpen || presenter.session.overlayOpen"
          variant="secondary"
          size="sm"
          @click="handleCloseDisplay"
        >
          Close display
        </SButton>
        <SButton size="sm" variant="primary" :disabled="!hasSlides" @click="handleOpenDisplay">
          <template #leading>
            <ExternalLink class="h-3.5 w-3.5" />
          </template>
          Open display
        </SButton>
      </template>
    </STopBar>

    <!-- 3-column body -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- ── Left panel: Library ─────────────────────────────────────────────── -->
      <div
        class="w-60 shrink-0 flex flex-col border-r border-line-subtle bg-surface-base/60 backdrop-blur-xl overflow-hidden"
      >
        <!-- Tab bar -->
        <div class="flex border-b border-line-subtle px-2 pt-2 gap-0.5 shrink-0">
          <button
            :class="[
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[12px] font-medium font-sans transition-colors',
              activeTab === 'scripture'
                ? 'bg-surface-raised text-ink-strong shadow-xs'
                : 'text-ink-muted hover:text-ink',
            ]"
            @click="activeTab = 'scripture'"
          >
            <BookOpen class="h-3.5 w-3.5" />
            Scripture
          </button>
          <button
            :class="[
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[12px] font-medium font-sans transition-colors',
              activeTab === 'songs'
                ? 'bg-surface-raised text-ink-strong shadow-xs'
                : 'text-ink-muted hover:text-ink',
            ]"
            @click="activeTab = 'songs'"
          >
            <Music2 class="h-3.5 w-3.5" />
            Songs
          </button>
        </div>

        <!-- ── Scripture panel ────────────────────────────────────────────────── -->
        <template v-if="activeTab === 'scripture'">
          <!-- VIEW: Book list -->
          <div v-if="browserView === 'books'" class="flex-1 flex flex-col min-h-0">
            <div class="px-2 pt-2 pb-1 shrink-0">
              <SInput v-model="bookSearch" size="sm" placeholder="Search books…">
                <template #leading>
                  <Search class="h-3 w-3" />
                </template>
              </SInput>
            </div>
            <!-- Non-sticky headers — panel is too narrow for sticky to look right -->
            <div class="flex-1 overflow-y-auto pb-2">
              <div v-if="filteredOT.length > 0">
                <p
                  class="px-3 pt-2.5 pb-1 text-[10px] font-semibold font-sans uppercase tracking-wider text-ink-subtle"
                >
                  Old Testament
                </p>
                <button
                  v-for="book in filteredOT"
                  :key="book.shortName"
                  class="group flex items-center justify-between w-full text-left px-3 py-1.5 text-[12px] font-sans transition-colors hover:bg-surface-canvas"
                  :class="loadedRef.startsWith(book.longName) ? 'text-brand-600' : 'text-ink'"
                  @click="selectBook(book)"
                >
                  <span class="truncate">{{ book.longName }}</span>
                  <span class="text-[10px] text-ink-subtle group-hover:text-ink-muted shrink-0 ml-1"
                    >{{ book.chapters }} ch</span
                  >
                </button>
              </div>
              <div v-if="filteredNT.length > 0">
                <p
                  class="px-3 pt-2.5 pb-1 text-[10px] font-semibold font-sans uppercase tracking-wider text-ink-subtle"
                >
                  New Testament
                </p>
                <button
                  v-for="book in filteredNT"
                  :key="book.shortName"
                  class="group flex items-center justify-between w-full text-left px-3 py-1.5 text-[12px] font-sans transition-colors hover:bg-surface-canvas"
                  :class="loadedRef.startsWith(book.longName) ? 'text-brand-600' : 'text-ink'"
                  @click="selectBook(book)"
                >
                  <span class="truncate">{{ book.longName }}</span>
                  <span class="text-[10px] text-ink-subtle group-hover:text-ink-muted shrink-0 ml-1"
                    >{{ book.chapters }} ch</span
                  >
                </button>
              </div>
              <p
                v-if="filteredOT.length === 0 && filteredNT.length === 0"
                class="px-3 py-6 text-xs text-ink-muted text-center font-sans"
              >
                No books match "{{ bookSearch }}"
              </p>
            </div>
          </div>

          <!-- VIEW: Chapter grid -->
          <div v-else-if="browserView === 'chapters'" class="flex-1 flex flex-col min-h-0">
            <div class="flex items-center gap-1 px-2 py-2 border-b border-line-subtle shrink-0">
              <SIconButton size="sm" label="Back to books" @click="backToBooks">
                <ChevronLeft class="h-3.5 w-3.5" />
              </SIconButton>
              <span class="text-[13px] font-semibold font-sans text-ink-strong truncate">
                {{ browsingBook?.longName }}
              </span>
            </div>
            <div class="flex-1 overflow-y-auto p-2">
              <div class="grid grid-cols-4 gap-1">
                <button
                  v-for="n in chapterRange"
                  :key="n"
                  :class="[
                    'h-9 rounded-lg text-[12px] font-medium font-sans transition-colors relative',
                    loadedRef === `${browsingBook?.longName} ${n}`
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-canvas hover:bg-surface-raised text-ink',
                    loadingChapter && browsingChapter === n && 'opacity-60',
                  ]"
                  :disabled="loadingChapter"
                  @click="loadScriptureChapter(browsingBook!, n)"
                >
                  {{ n }}
                  <SSpinner
                    v-if="loadingChapter && browsingChapter === n"
                    size="xs"
                    class="absolute inset-0 m-auto"
                  />
                </button>
              </div>
            </div>
          </div>

          <!-- VIEW: Verse list -->
          <div v-else class="flex-1 flex flex-col min-h-0">
            <div class="flex items-center gap-1 px-2 py-2 border-b border-line-subtle shrink-0">
              <SIconButton size="sm" label="Back to chapters" @click="backToChapters">
                <ChevronLeft class="h-3.5 w-3.5" />
              </SIconButton>
              <div class="min-w-0 flex-1">
                <p
                  class="text-[13px] font-semibold font-sans text-ink-strong truncate leading-tight"
                >
                  {{ browsingBook?.longName }} {{ browsingChapter }}
                </p>
                <p class="text-[10px] text-ink-subtle font-sans">
                  {{ loadedChapterSlides.length }} verses · tap to jump
                </p>
              </div>
            </div>

            <!-- Verse list — ref'd for auto-scroll; only highlights when this chapter is in queue -->
            <div ref="verseListRef" class="flex-1 overflow-y-auto">
              <button
                v-for="(s, i) in loadedChapterSlides"
                :key="s.verseRef"
                :class="[
                  'group w-full text-left px-3 py-2 border-b border-line-subtle last:border-b-0 transition-colors',
                  isQueuedChapter && presenter.session.currentIndex === i
                    ? 'bg-brand-50 dark:bg-brand-500/15'
                    : 'hover:bg-surface-canvas',
                ]"
                @click="presenter.goTo(i)"
              >
                <div class="flex items-start gap-2">
                  <span
                    :class="[
                      'text-[11px] font-bold font-sans shrink-0 w-5 text-right mt-px leading-tight',
                      isQueuedChapter && presenter.session.currentIndex === i
                        ? 'text-brand-500'
                        : 'text-ink-subtle group-hover:text-ink-muted',
                    ]"
                  >
                    {{ s.verse }}
                  </span>
                  <p
                    :class="[
                      'text-[12px] font-sans leading-snug line-clamp-3',
                      isQueuedChapter && presenter.session.currentIndex === i
                        ? 'text-brand-700 dark:text-brand-200'
                        : 'text-ink',
                    ]"
                  >
                    {{ s.text }}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </template>

        <!-- ── Songs panel ─────────────────────────────────────────────────────── -->
        <template v-else>
          <div class="px-2 pt-2 pb-1 shrink-0">
            <SInput v-model="songSearch" size="sm" placeholder="Search songs…">
              <template #leading>
                <Search class="h-3 w-3" />
              </template>
            </SInput>
          </div>
          <div class="flex-1 overflow-y-auto">
            <button
              v-for="song in filteredSongs"
              :key="song.id"
              class="group flex items-start justify-between w-full text-left px-3 py-2.5 transition-colors hover:bg-surface-canvas border-b border-line-subtle last:border-b-0"
              @click="loadSong(song)"
            >
              <div class="min-w-0">
                <p class="text-[13px] font-medium font-sans text-ink truncate">
                  {{ song.title }}
                </p>
                <p v-if="song.author" class="text-[11px] text-ink-muted font-sans mt-0.5">
                  {{ song.author }}{{ song.year ? ` · ${song.year}` : '' }}
                </p>
              </div>
              <span class="text-[10px] text-ink-subtle shrink-0 mt-0.5"
                >{{ song.sections.length }} slides</span
              >
            </button>
            <p
              v-if="filteredSongs.length === 0"
              class="px-3 py-6 text-xs text-ink-muted text-center font-sans"
            >
              No songs found
            </p>
          </div>
          <div class="px-2 py-2 border-t border-line-subtle shrink-0">
            <SButton variant="secondary" size="sm" class="w-full" @click="addSongModal = true">
              <template #leading>
                <Plus class="h-3.5 w-3.5" />
              </template>
              Add song
            </SButton>
          </div>
        </template>
      </div>

      <!-- ── Center: Preview + slide queue ──────────────────────────────────── -->
      <div class="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <!-- Scale-transform preview -->
        <div class="flex-[0_0_auto] p-4 pb-2">
          <div
            ref="previewContainerRef"
            class="w-full aspect-[16/9] relative overflow-hidden rounded-xl shadow-modal border border-white/[0.06]"
          >
            <!--
              Inner canvas is always 1920×1080 and scaled to fit.
              Fixed px font sizes prevent overflow at any preview size.
            -->
            <div
              :class="biblePrefs.presenterRootClass"
              :style="{
                width: `${refW}px`,
                height: `${refH}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }"
              class="absolute top-0 left-0 flex items-center justify-center"
            >
              <SPresenterSlide
                :slide="slide"
                :slide-key="presenter.session.currentIndex"
                canvas-mode
                show-empty
                :blanked="presenter.isBlanked"
              />
            </div>

            <!-- Blanked overlay label on top of preview -->
            <div
              v-if="presenter.isBlanked"
              class="absolute inset-0 flex items-center justify-center"
            >
              <span
                class="text-[10px] font-semibold font-sans uppercase tracking-widest text-slate-600"
              >
                Screen blanked
              </span>
            </div>
          </div>
        </div>

        <!-- Progress + navigation -->
        <div class="px-4 pb-3 shrink-0">
          <div class="h-0.5 bg-line rounded-full overflow-hidden mb-2.5">
            <div
              class="h-full bg-brand-500 rounded-full transition-all duration-300"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1">
              <SButton
                variant="secondary"
                size="sm"
                :disabled="!presenter.hasPrev"
                @click="presenter.prev()"
              >
                <template #leading>
                  <ChevronLeft class="h-3.5 w-3.5" />
                </template>
                Prev
              </SButton>
              <SButton size="sm" :disabled="!presenter.hasNext" @click="presenter.next()">
                Next
                <template #trailing>
                  <ChevronRight class="h-3.5 w-3.5" />
                </template>
              </SButton>
            </div>
            <span v-if="hasSlides" class="text-xs text-ink-muted font-sans tabular-nums">
              {{ presenter.session.currentIndex + 1 }} / {{ presenter.session.slides.length }}
            </span>
            <!-- Blank toggle in controls bar -->
            <SButton
              variant="secondary"
              size="sm"
              :disabled="!hasSlides"
              :class="presenter.isBlanked ? 'ring-1 ring-amber-400 text-amber-600' : ''"
              @click="presenter.toggleBlank()"
            >
              <template #leading>
                <EyeOff v-if="!presenter.isBlanked" class="h-3.5 w-3.5" />
                <Eye v-else class="h-3.5 w-3.5" />
              </template>
              {{ presenter.isBlanked ? 'Show' : 'Blank' }}
            </SButton>
          </div>
        </div>

        <!-- Slide queue -->
        <div class="flex-1 overflow-y-auto border-t border-line-subtle">
          <div
            v-if="!hasSlides"
            class="flex flex-col items-center justify-center h-full text-center py-8"
          >
            <SEmptyState
              tone="violet"
              title="Ready for Sunday"
              description="Choose a Scripture chapter or worship song from the library to load slides."
            >
              <template #icon>
                <Monitor class="h-5 w-5" />
              </template>
            </SEmptyState>
          </div>
          <div v-else>
            <p
              class="px-4 py-2 text-[10px] font-semibold font-sans uppercase tracking-wider text-ink-subtle border-b border-line-subtle"
            >
              Slides · {{ presenter.session.slides.length }}
            </p>
            <button
              v-for="(s, i) in presenter.session.slides"
              :key="i"
              :class="[
                'w-full text-left px-4 py-2.5 border-b border-line-subtle last:border-b-0 transition-colors',
                i === presenter.session.currentIndex
                  ? 'bg-brand-50 dark:bg-brand-500/15'
                  : 'hover:bg-surface-canvas',
              ]"
              @click="presenter.goTo(i)"
            >
              <p
                :class="[
                  'text-[11px] font-semibold font-sans mb-0.5 uppercase tracking-wider',
                  i === presenter.session.currentIndex
                    ? 'text-brand-600 dark:text-brand-300'
                    : 'text-ink-subtle',
                ]"
              >
                <template v-if="s.source === 'song'">
                  {{ s.sectionLabel }}
                </template>
                <template v-else> {{ s.book }} {{ s.chapter }}:{{ s.verse }} </template>
              </p>
              <p
                :class="[
                  'text-xs font-sans line-clamp-2 whitespace-pre-line',
                  i === presenter.session.currentIndex
                    ? 'text-brand-700 dark:text-brand-200'
                    : 'text-ink-muted',
                ]"
              >
                {{ s.text }}
              </p>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Right panel: Display settings ──────────────────────────────────── -->
      <div
        class="w-52 shrink-0 flex flex-col border-l border-line-subtle bg-surface-base/60 backdrop-blur-xl overflow-y-auto"
      >
        <div class="px-3 py-3 space-y-5">
          <p class="text-[10px] font-semibold font-sans uppercase tracking-wider text-ink-subtle">
            Display settings
          </p>

          <!-- Output monitor -->
          <div>
            <p class="text-[11px] font-medium font-sans text-ink-muted mb-2">Output monitor</p>
            <div class="flex flex-col gap-1">
              <button
                v-for="(mon, i) in monitors"
                :key="i"
                :class="[
                  'flex items-start gap-2 w-full px-2 py-2 rounded-lg text-left transition-colors',
                  selectedMonitorIndex === i
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                    : 'hover:bg-surface-canvas text-ink',
                ]"
                @click="selectedMonitorIndex = i"
              >
                <Monitor class="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div class="min-w-0">
                  <p class="text-[12px] font-sans truncate leading-tight">
                    {{ mon.name }}
                  </p>
                  <p class="text-[10px] text-ink-subtle font-sans mt-0.5">
                    {{ mon.width }}×{{ mon.height }}
                  </p>
                </div>
              </button>
            </div>
            <p v-if="monitorsLoading" class="text-[10px] text-ink-subtle font-sans mt-1.5">
              Detecting monitors…
            </p>
          </div>

          <!-- Background -->
          <div>
            <p class="text-[11px] font-medium font-sans text-ink-muted mb-2">Background</p>
            <div class="flex flex-col gap-1">
              <button
                v-for="bg in BG_OPTIONS"
                :key="bg.value"
                :class="[
                  'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] font-sans transition-colors text-left',
                  biblePrefs.presenterBackground === bg.value
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                    : 'hover:bg-surface-canvas text-ink',
                ]"
                @click="biblePrefs.setPresenterBackground(bg.value)"
              >
                <span
                  class="h-3 w-3 rounded-full border border-white/20 shrink-0"
                  :style="{ background: bg.dot }"
                />
                {{ bg.label }}
              </button>
            </div>
          </div>

          <!-- Font scale -->
          <div>
            <p class="text-[11px] font-medium font-sans text-ink-muted mb-2">Text size</p>
            <div class="flex flex-col gap-1">
              <button
                v-for="fs in FONT_OPTIONS"
                :key="fs.value"
                :class="[
                  'flex items-center w-full px-2 py-1.5 rounded-lg text-[12px] font-sans transition-colors text-left',
                  biblePrefs.presenterFontScale === fs.value
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                    : 'hover:bg-surface-canvas text-ink',
                ]"
                @click="biblePrefs.setPresenterFontScale(fs.value)"
              >
                {{ fs.label }}
              </button>
            </div>
          </div>

          <!-- Show verse ref -->
          <div>
            <p class="text-[11px] font-medium font-sans text-ink-muted mb-2">Verse reference</p>
            <button
              :class="[
                'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] font-sans transition-colors text-left',
                biblePrefs.presenterShowVerseRef
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                  : 'hover:bg-surface-canvas text-ink-muted',
              ]"
              @click="biblePrefs.setPresenterShowVerseRef(!biblePrefs.presenterShowVerseRef)"
            >
              <span
                :class="[
                  'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                  biblePrefs.presenterShowVerseRef
                    ? 'border-brand-500 bg-brand-500'
                    : 'border-line',
                ]"
              >
                <svg
                  v-if="biblePrefs.presenterShowVerseRef"
                  class="h-2.5 w-2.5 text-white"
                  fill="none"
                  viewBox="0 0 12 12"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              Show reference
            </button>
          </div>

          <!-- Translation -->
          <div>
            <p class="text-[11px] font-medium font-sans text-ink-muted mb-1">Translation</p>
            <p class="text-[12px] font-sans text-ink">
              {{ presenterTranslationHint }}
            </p>
            <p class="text-[10px] text-ink-subtle font-sans mt-0.5">Change in Settings</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Fullscreen presenter overlay ───────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="presenter.session.overlayOpen"
        ref="overlayRef"
        :class="[
          'fixed inset-0 z-[9999] flex flex-col items-center justify-center outline-none',
          'select-none cursor-pointer',
          presenter.isBlanked ? 'bg-black' : biblePrefs.presenterRootClass,
        ]"
        tabindex="-1"
        @click.self="presenter.next()"
        @keydown.right="presenter.next()"
        @keydown.left="presenter.prev()"
        @keydown.space.prevent="presenter.next()"
        @keydown.b="presenter.toggleBlank()"
        @keydown.escape="handleCloseDisplay"
      >
        <!-- Slide content -->
        <SPresenterSlide
          :slide="presenter.currentSlide"
          :slide-key="presenter.session.currentIndex"
          :blanked="presenter.isBlanked"
        />

        <!-- Bottom HUD — always visible but dim; fades to near-invisible -->
        <div
          class="absolute bottom-6 inset-x-0 flex items-center justify-between px-8 pointer-events-none overlay-hud"
        >
          <span class="text-slate-700 text-[11px] font-sans tabular-nums">
            {{ presenter.session.currentIndex + 1 }} / {{ presenter.session.slides.length }}
          </span>
          <span class="text-slate-700 text-[11px] font-sans">
            Click · ← → Space to advance · B to blank · Esc to close
          </span>
          <!-- Blank indicator -->
          <span
            v-if="presenter.isBlanked"
            class="text-amber-500 text-[11px] font-semibold font-sans uppercase tracking-wider pointer-events-auto"
            @click.stop="presenter.toggleBlank()"
          >
            BLANKED — click to show
          </span>
          <span v-else class="text-transparent text-[11px] font-sans"> &nbsp; </span>
        </div>

        <!-- Close button — appears on hover via overlay-hud animation -->
        <button
          class="absolute top-5 right-5 flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-colors overlay-hud pointer-events-auto"
          @click.stop="handleCloseDisplay"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </Teleport>

    <!-- Add song modal -->
    <SModal
      :open="addSongModal"
      title="Add song"
      description="Add a worship song to your library."
      size="md"
      @close="addSongModal = false"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <SInput v-model="newSong.title" label="Title" placeholder="Amazing Grace" required />
          <SInput v-model="newSong.author" label="Author" placeholder="John Newton (optional)" />
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-ink-strong">Sections</p>
            <SButton variant="secondary" size="sm" @click="addSongSection">
              <template #leading>
                <Plus class="h-3.5 w-3.5" />
              </template>
              Add section
            </SButton>
          </div>
          <div
            v-for="(sec, i) in newSong.sections"
            :key="i"
            class="border border-line rounded-lg p-3 space-y-2"
          >
            <div class="flex items-center gap-2">
              <SInput v-model="sec.label" size="sm" placeholder="Verse 1" class="flex-1" />
              <SIconButton size="sm" label="Remove section" @click="removeSongSection(i)">
                <Trash2 class="h-3.5 w-3.5" />
              </SIconButton>
            </div>
            <STextarea v-model="sec.text" :rows="3" placeholder="Paste lyrics here…" autoresize />
          </div>
        </div>
      </div>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="addSongModal = false"> Cancel </SButton>
        <SButton size="sm" :disabled="!newSong.title.trim()" @click="submitNewSong">
          Save song
        </SButton>
      </template>
    </SModal>
  </div>
</template>

<style scoped>
  .presenter-fade-enter-active,
  .presenter-fade-leave-active {
    transition: opacity 0.12s ease;
  }
  .presenter-fade-enter-from,
  .presenter-fade-leave-to {
    opacity: 0;
  }

  /* HUD fades in for 2s then retreats to near-invisible */
  @keyframes hud-appear {
    0% {
      opacity: 0;
    }
    15% {
      opacity: 0.8;
    }
    60% {
      opacity: 0.8;
    }
    100% {
      opacity: 0.08;
    }
  }
  .overlay-hud {
    animation: hud-appear 5s ease-out forwards;
  }
  .overlay-hud:hover {
    opacity: 0.8;
    animation: none;
  }
</style>
