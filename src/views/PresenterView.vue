<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    GripHorizontal,
    EyeOff,
    Eye,
    Monitor,
    Music2,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
  } from 'lucide-vue-next'
  import { usePresenterStore } from '@/stores/presenter.store'
  import {
    useBiblePreferencesStore,
    type PresenterBackground,
  } from '@/stores/biblePreferences.store'
  import { useSongsStore } from '@/stores/songs.store'
  import { useLanguageSongsStore } from '@/stores/languageSongs.store'
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
  const languageSongsStore = useLanguageSongsStore()
  const pendingDeleteSongId = ref<string | null>(null)
  const loadingSongId = ref<string | null>(null)
  const toast = useSToast()

  // ── Scale-transform preview ───────────────────────────────────────────────────
  const previewContainerRef = ref<HTMLElement | null>(null)
  const previewColumnRef = ref<HTMLElement | null>(null)
  const overlayRef = ref<HTMLElement | null>(null)
  const verseListRef = ref<HTMLElement | null>(null)
  const {
    scale,
    refW,
    refH,
    containerWidth: previewW,
    containerHeight: previewH,
  } = usePresenterScale(previewContainerRef)

  const PREVIEW_MIN_HEIGHT = 220
  const PREVIEW_QUEUE_MIN_HEIGHT = 180
  const previewHeightPx = ref<number | null>(null)
  const resizingPreview = ref(false)
  let previewResizeStartY = 0
  let previewResizeStartHeight = 0

  const previewFrameClass = computed(() => [
    'w-full relative overflow-hidden rounded-xl shadow-modal border border-white/[0.06]',
    previewHeightPx.value === null ? 'aspect-[16/9]' : '',
  ])

  const previewFrameStyle = computed(() =>
    previewHeightPx.value === null ? undefined : { height: `${previewHeightPx.value}px` }
  )

  const previewCanvasStyle = computed(() => {
    const scaledW = refW * scale.value
    const scaledH = refH * scale.value
    const offsetX = Math.max(0, (previewW.value - scaledW) / 2)
    const offsetY = Math.max(0, (previewH.value - scaledH) / 2)

    return {
      width: `${refW}px`,
      height: `${refH}px`,
      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale.value})`,
      transformOrigin: 'top left',
    }
  })

  function maxPreviewHeight() {
    const available = previewColumnRef.value?.clientHeight ?? 720
    return Math.max(PREVIEW_MIN_HEIGHT, available - PREVIEW_QUEUE_MIN_HEIGHT)
  }

  function clampPreviewHeight(height: number) {
    return Math.round(Math.min(Math.max(height, PREVIEW_MIN_HEIGHT), maxPreviewHeight()))
  }

  function resizePreview(event: PointerEvent) {
    if (!resizingPreview.value) return
    const delta = event.clientY - previewResizeStartY
    previewHeightPx.value = clampPreviewHeight(previewResizeStartHeight + delta)
  }

  function stopPreviewResize() {
    resizingPreview.value = false
    window.removeEventListener('pointermove', resizePreview)
    window.removeEventListener('pointerup', stopPreviewResize)
  }

  function startPreviewResize(event: PointerEvent) {
    const frame = previewContainerRef.value
    if (!frame) return

    event.preventDefault()
    resizingPreview.value = true
    previewResizeStartY = event.clientY
    previewResizeStartHeight = frame.getBoundingClientRect().height
    window.addEventListener('pointermove', resizePreview)
    window.addEventListener('pointerup', stopPreviewResize, { once: true })
  }

  function resetPreviewHeight() {
    previewHeightPx.value = null
  }

  function clampCurrentPreviewHeight() {
    if (previewHeightPx.value !== null) {
      previewHeightPx.value = clampPreviewHeight(previewHeightPx.value)
    }
  }

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
    loadAbortController?.abort()
    browsingBook.value = null
    browsingChapter.value = null
    loadedChapterSlides.value = []
    browserView.value = 'books'
  }

  function backToChapters() {
    loadAbortController?.abort()
    browsingChapter.value = null
    loadedChapterSlides.value = []
    browserView.value = 'chapters'
  }

  function displayLoadedVerse(index: number) {
    if (!loadedChapterSlides.value.length) return
    if (!isQueuedChapter.value) {
      presenter.loadSlides(loadedChapterSlides.value)
    }
    presenter.goTo(index)
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
    return songs.allSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || (s.nativeTitle?.toLowerCase().includes(q) ?? false)
    )
  })

  function songSlides(song: Song): SongSlide[] {
    return song.sections.map((sec, i) => ({
      source: 'song' as const,
      verseRef: `song.${song.id}.${i}`,
      text: sec.text,
      songTitle: song.title,
      sectionLabel: sec.label,
    }))
  }

  async function loadSong(song: Song): Promise<void> {
    let sections = song.sections

    if (song.id.startsWith('lang-') && sections.length === 0) {
      loadingSongId.value = song.id
      try {
        sections = await languageSongsStore.loadSongById(song.id)
      } catch {
        toast.error('Could not load song', 'Check your connection and try again.')
        return
      } finally {
        loadingSongId.value = null
      }
    }

    if (sections.length === 0) {
      toast.error('No content', 'This song has no slides.')
      return
    }

    const slides = sections.map((sec, i) => ({
      source: 'song' as const,
      verseRef: `song.${song.id}.${i}`,
      text: sec.text,
      songTitle: song.title,
      sectionLabel: sec.label,
    }))
    presenter.loadSlides(slides)
    toast.success('Song loaded', `${song.title} ready to present`)
  }

  function confirmDeleteSong(song: Song) {
    pendingDeleteSongId.value = song.id
  }

  function executeDeleteSong() {
    if (!pendingDeleteSongId.value) return
    songs.removeSong(pendingDeleteSongId.value)
    pendingDeleteSongId.value = null
    toast.success('Song deleted')
  }

  // ── Song editor modal ────────────────────────────────────────────────────────
  interface SongForm {
    title: string
    author: string
    year: string
    sections: SongSection[]
  }

  const songModalOpen = ref(false)
  const editingSongId = ref<string | null>(null)
  const songForm = ref<SongForm>({
    title: '',
    author: '',
    year: '',
    sections: [{ type: 'verse', label: 'Verse 1', text: '' }],
  })

  const songModalTitle = computed(() => (editingSongId.value ? 'Edit song' : 'Add song'))
  const songModalDescription = computed(() =>
    editingSongId.value
      ? 'Update the saved title, details, and lyrics for this song.'
      : 'Add a worship song to your library.'
  )
  const songModalSubmitLabel = computed(() => (editingSongId.value ? 'Save changes' : 'Save song'))

  function emptySongForm(): SongForm {
    return {
      title: '',
      author: '',
      year: '',
      sections: [{ type: 'verse', label: 'Verse 1', text: '' }],
    }
  }

  function openAddSongModal() {
    editingSongId.value = null
    songForm.value = emptySongForm()
    songModalOpen.value = true
  }

  function openEditSongModal(song: Song) {
    editingSongId.value = song.id
    songForm.value = {
      title: song.title,
      author: song.author ?? '',
      year: song.year?.toString() ?? '',
      sections: song.sections.map((section) => ({ ...section })),
    }
    songModalOpen.value = true
  }

  function closeSongModal() {
    songModalOpen.value = false
  }

  function addSongSection() {
    const existing = songForm.value.sections
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
    songForm.value.sections.push({ type, label, text: '' })
  }

  function removeSongSection(i: number) {
    if (songForm.value.sections.length <= 1) {
      songForm.value.sections = [{ type: 'verse', label: 'Verse 1', text: '' }]
      return
    }
    songForm.value.sections.splice(i, 1)
  }

  function submitSongForm() {
    const title = songForm.value.title.trim()
    if (!title) return

    const sections = songForm.value.sections
      .map((section) => ({
        type: section.type,
        label: section.label.trim() || section.type,
        text: section.text.trim(),
      }))
      .filter((s) => s.text)
    if (sections.length === 0) {
      toast.error('No lyrics added', 'Enter lyrics for at least one section before saving.')
      return
    }

    const yearText = songForm.value.year.trim()
    const year = yearText ? Number.parseInt(yearText, 10) : undefined
    if (yearText && (!year || year < 1)) {
      toast.error('Invalid year', 'Enter a valid year or leave it blank.')
      return
    }

    const payload = {
      title,
      author: songForm.value.author.trim() || undefined,
      year,
      sections,
    }

    if (editingSongId.value) {
      const id = editingSongId.value
      const currentIndex = presenter.session.currentIndex
      const isLoaded = presenter.session.slides.some(
        (slide) => slide.source === 'song' && slide.verseRef.startsWith(`song.${id}.`)
      )

      songs.updateSong(id, payload)
      if (isLoaded) {
        const updatedSong = songs.allSongs.find((song) => song.id === id)
        if (updatedSong) {
          const slides = songSlides(updatedSong)
          presenter.loadSlides(slides)
          presenter.goTo(Math.min(currentIndex, slides.length - 1))
        }
      }
      toast.success('Song saved', `${title} has been updated.`)
    } else {
      songs.addSong(payload)
      toast.success('Song saved', `${title} has been added to the library.`)
    }

    closeSongModal()
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
        window.addEventListener('keydown', handleOverlayKeydown)
        await nextTick()
        try {
          await overlayRef.value?.requestFullscreen?.()
        } catch {
          /* fullscreen blocked */
        }
        // Re-focus after fullscreen transition takes control
        overlayRef.value?.focus()
      } else {
        window.removeEventListener('keydown', handleOverlayKeydown)
        if (document.fullscreenElement) await document.exitFullscreen?.()
      }
    }
  )

  function onFullscreenChange() {
    if (!document.fullscreenElement && presenter.session.overlayOpen) {
      presenter.closeOverlay()
    }
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange)
    window.addEventListener('resize', clampCurrentPreviewHeight)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    window.removeEventListener('keydown', handleOverlayKeydown)
    window.removeEventListener('resize', clampCurrentPreviewHeight)
    stopPreviewResize()
    loadAbortController?.abort()
    if (presenter.session.overlayOpen || presenter.session.displayWindowOpen) {
      void handleCloseDisplay()
    }
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

  function handleOverlayKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || !presenter.session.overlayOpen) return

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
      case 'Enter':
        event.preventDefault()
        presenter.next()
        break
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        event.preventDefault()
        presenter.prev()
        break
      case 'b':
      case 'B':
        event.preventDefault()
        presenter.toggleBlank()
        break
      case 'Escape':
        event.preventDefault()
        void handleCloseDisplay()
        break
      default:
        break
    }
  }

  // ── Settings options ──────────────────────────────────────────────────────────
  const BG_OPTIONS = computed<{ value: PresenterBackground; label: string; dot: string }[]>(() => [
    { value: 'black', label: 'Black', dot: '#000000' },
    { value: 'navy', label: 'Navy', dot: '#0f172a' },
    { value: 'gradient', label: 'Gradient', dot: 'linear-gradient(135deg, #1e293b, #000)' },
    { value: 'warm', label: 'Warm', dot: 'linear-gradient(135deg, #5b2333, #f59e0b)' },
    { value: 'forest', label: 'Forest', dot: 'linear-gradient(135deg, #052e2b, #14532d)' },
    { value: 'aurora', label: 'Aurora live', dot: 'linear-gradient(135deg, #14b8a6, #111827)' },
    { value: 'radiance', label: 'Radiance live', dot: 'linear-gradient(135deg, #3b82f6, #3f1d38)' },
    { value: 'custom', label: 'Custom', dot: biblePrefs.presenterCustomBackground },
  ])

  const presenterCustomColor = computed(() =>
    /^#[0-9a-f]{6}$/i.test(biblePrefs.presenterCustomBackground)
      ? biblePrefs.presenterCustomBackground
      : '#111827'
  )

  function updatePresenterCustomBackground(value: string) {
    biblePrefs.setPresenterCustomBackground(value)
    biblePrefs.setPresenterBackground('custom')
  }

  const FONT_OPTIONS = [
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'large', label: 'Large' },
    { value: 'auditorium', label: 'Auditorium' },
  ] as const

  const MAX_BACKGROUND_IMAGE_BYTES = 2_500_000

  function readPresenterImageAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
          return
        }
        reject(new Error('Could not import image'))
      }
      reader.onerror = () => reject(new Error('Could not import image'))
      reader.readAsDataURL(file)
    })
  }

  async function importPresenterBackground(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Background not imported', 'Choose an image file.')
      return
    }
    if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
      toast.error('Background not imported', 'Use an image smaller than 2.5 MB.')
      return
    }

    try {
      const dataUrl = await readPresenterImageAsDataUrl(file)
      biblePrefs.setPresenterCustomBackground(
        `linear-gradient(rgba(2, 6, 23, 0.32), rgba(2, 6, 23, 0.32)), url("${dataUrl}") center / cover`
      )
      biblePrefs.setPresenterBackground('custom')
      toast.success('Background imported', file.name)
    } catch (error) {
      toast.error('Background not imported', error instanceof Error ? error.message : undefined)
    }
  }
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
            <div ref="verseListRef" class="presenter-verse-list flex-1 overflow-y-auto">
              <button
                v-for="(s, i) in loadedChapterSlides"
                :key="s.verseRef"
                :class="[
                  'group block w-full text-left px-3 py-1.5 border-b border-line-subtle last:border-b-0 transition-colors',
                  isQueuedChapter && presenter.session.currentIndex === i
                    ? 'bg-brand-50 dark:bg-brand-500/15'
                    : 'hover:bg-surface-canvas',
                ]"
                @click="displayLoadedVerse(i)"
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
                      'text-[12px] font-sans leading-snug line-clamp-2',
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
            <div
              v-for="song in filteredSongs"
              :key="song.id"
              class="group flex items-start gap-1 border-b border-line-subtle last:border-b-0 hover:bg-surface-canvas"
            >
              <button
                type="button"
                class="min-w-0 flex-1 flex items-start justify-between text-left px-3 py-2.5 transition-colors"
                :disabled="loadingSongId === song.id"
                @click="loadSong(song)"
              >
                <div class="min-w-0">
                  <p class="text-[13px] font-medium font-sans text-ink truncate">
                    {{ song.title }}
                  </p>
                  <p
                    v-if="song.nativeTitle"
                    class="text-[11px] text-ink-muted font-sans mt-0.5 truncate"
                  >
                    {{ song.nativeTitle }}
                  </p>
                  <p
                    v-else-if="song.author || song.year"
                    class="text-[11px] text-ink-muted font-sans mt-0.5"
                  >
                    {{ [song.author, song.year].filter(Boolean).join(' · ') }}
                  </p>
                </div>
                <span class="shrink-0 mt-0.5 ml-2 flex items-center">
                  <SSpinner v-if="loadingSongId === song.id" size="xs" />
                  <span v-else-if="song.sections.length > 0" class="text-[10px] text-ink-subtle"
                    >{{ song.sections.length }} slides</span
                  >
                  <span v-else-if="song.id.startsWith('lang-')" class="text-[10px] text-ink-subtle"
                    >tap to load</span
                  >
                  <span v-else class="text-[10px] text-ink-subtle"
                    >{{ song.sections.length }} slides</span
                  >
                </span>
              </button>
              <SIconButton
                size="sm"
                variant="ghost"
                class="mt-2"
                :label="`Edit ${song.title}`"
                @click.stop="openEditSongModal(song)"
              >
                <Pencil class="h-3.5 w-3.5" />
              </SIconButton>
              <SIconButton
                v-if="song.isCustom"
                size="sm"
                variant="ghost"
                class="mr-2 mt-2"
                :label="`Delete ${song.title}`"
                @click.stop="confirmDeleteSong(song)"
              >
                <Trash2 class="h-3.5 w-3.5 text-red-500" />
              </SIconButton>
            </div>
            <p
              v-if="filteredSongs.length === 0"
              class="px-3 py-6 text-xs text-ink-muted text-center font-sans"
            >
              No songs found
            </p>
          </div>
          <div class="px-2 py-2 border-t border-line-subtle shrink-0">
            <SButton variant="secondary" size="sm" class="w-full" @click="openAddSongModal">
              <template #leading>
                <Plus class="h-3.5 w-3.5" />
              </template>
              Add song
            </SButton>
          </div>
        </template>
      </div>

      <!-- ── Center: Preview + slide queue ──────────────────────────────────── -->
      <div ref="previewColumnRef" class="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <!-- Scale-transform preview -->
        <div class="flex-[0_0_auto] p-4 pb-2">
          <div
            ref="previewContainerRef"
            :class="[previewFrameClass, biblePrefs.presenterRootClass]"
            :style="[previewFrameStyle, biblePrefs.presenterRootStyle]"
          >
            <!--
              Inner canvas is always 1920×1080 and scaled to fit.
              Fixed px font sizes prevent overflow at any preview size.
            -->
            <div
              :class="biblePrefs.presenterRootClass"
              :style="[previewCanvasStyle, biblePrefs.presenterRootStyle]"
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
          <button
            type="button"
            class="mt-1 flex h-4 w-full items-center justify-center rounded cursor-row-resize text-ink-subtle hover:text-ink-muted hover:bg-surface-canvas transition-colors"
            aria-label="Resize presenter preview"
            title="Resize presenter preview"
            @pointerdown="startPreviewResize"
            @dblclick="resetPreviewHeight"
          >
            <GripHorizontal class="h-3.5 w-3.5" />
          </button>
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
                <template v-else-if="s.source === 'notation'">
                  {{ s.title }}
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
            <div v-if="biblePrefs.presenterBackground === 'custom'" class="mt-2 space-y-2">
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  :value="presenterCustomColor"
                  class="h-7 w-9 rounded-md border border-line bg-transparent"
                  aria-label="Custom presenter background colour"
                  @input="
                    updatePresenterCustomBackground(($event.target as HTMLInputElement).value)
                  "
                />
                <input
                  :value="biblePrefs.presenterCustomBackground"
                  class="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface-base px-2 text-[12px] text-ink-strong focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  aria-label="Custom presenter background"
                  @input="
                    updatePresenterCustomBackground(($event.target as HTMLInputElement).value)
                  "
                />
              </div>
              <label
                class="flex h-8 cursor-pointer items-center justify-center rounded-md border border-line bg-surface-raised px-2 text-[12px] font-medium text-ink-strong hover:bg-surface-canvas"
              >
                Import image
                <input
                  type="file"
                  accept="image/*"
                  class="sr-only"
                  @change="importPresenterBackground"
                />
              </label>
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
        :style="presenter.isBlanked ? undefined : biblePrefs.presenterRootStyle"
        tabindex="-1"
        @click.self="presenter.next()"
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

    <!-- Delete song confirmation modal -->
    <SModal
      :open="!!pendingDeleteSongId"
      title="Delete song?"
      size="sm"
      @close="pendingDeleteSongId = null"
    >
      <p class="text-sm text-ink-muted">
        This song will be permanently removed from your library. This cannot be undone.
      </p>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="pendingDeleteSongId = null">Cancel</SButton>
        <SButton variant="danger" size="sm" @click="executeDeleteSong">Delete</SButton>
      </template>
    </SModal>

    <!-- Song editor modal -->
    <SModal
      :open="songModalOpen"
      :title="songModalTitle"
      :description="songModalDescription"
      size="md"
      @close="closeSongModal"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-3">
          <SInput
            v-model="songForm.title"
            label="Title"
            placeholder="Amazing Grace"
            required
            class="col-span-3 sm:col-span-1"
          />
          <SInput
            v-model="songForm.author"
            label="Author"
            placeholder="John Newton"
            class="col-span-3 sm:col-span-1"
          />
          <SInput
            v-model="songForm.year"
            label="Year"
            placeholder="1779"
            inputmode="numeric"
            class="col-span-3 sm:col-span-1"
          />
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
            v-for="(sec, i) in songForm.sections"
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
        <SButton variant="secondary" size="sm" @click="closeSongModal"> Cancel </SButton>
        <SButton size="sm" :disabled="!songForm.title.trim()" @click="submitSongForm">
          {{ songModalSubmitLabel }}
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

  .presenter-verse-list {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }

  .presenter-verse-list > button {
    flex: 0 0 auto;
    min-height: 0;
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
