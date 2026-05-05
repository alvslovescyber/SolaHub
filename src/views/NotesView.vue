<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    BookOpen,
    Copy,
    ExternalLink,
    FileText,
    Image,
    Monitor,
    Palette,
    Pencil,
    Plus,
    Search,
    Share2,
    StickyNote,
    Trash2,
    Type,
    X,
  } from 'lucide-vue-next'
  import { useNotesStore } from '@/stores/notes.store'
  import { useNotationsStore } from '@/stores/notations.store'
  import { usePresenterStore } from '@/stores/presenter.store'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import { backgroundStyle, NOTATION_BACKGROUND_PRESETS } from '@/lib/presenterBackgrounds'
  import { bibleService, CANONICAL_BOOKS } from '@/services/bible.service'
  import { useDisplayMonitors } from '@/composables/useDisplayMonitors'
  import { isTauri } from '@/lib/platform'
  import type {
    NotationElement,
    NotationSlide,
    NotationTextAlign,
    NotationTextWeight,
    SlideBackground,
    SlideBackgroundType,
    SlideTextTone,
  } from '@/types/presenter.types'
  import type { VerseNote } from '@/types/notes.types'
  import {
    SButton,
    SChip,
    SContextMenu,
    SIconButton,
    SInput,
    SModal,
    SNotationSlideCanvas,
    SPresenterSlide,
    SSpinner,
    SSwitch,
    STextarea,
    STopBar,
    useSToast,
  } from '@/components/s'

  const notes = useNotesStore()
  const notations = useNotationsStore()
  const presenter = usePresenterStore()
  const biblePrefs = useBiblePreferencesStore()
  const router = useRouter()
  const toast = useSToast()
  const { monitors, selectedMonitorIndex, loading: monitorsLoading } = useDisplayMonitors()

  const VERSE_REF_PATTERN = /^[A-Za-z]{2,4}\.\d+(\.\d+)?$/
  const ALIGN_OPTIONS = [
    { value: 'left', label: 'Align left', icon: AlignLeft },
    { value: 'center', label: 'Align center', icon: AlignCenter },
    { value: 'right', label: 'Align right', icon: AlignRight },
  ] as const
  const TEXT_TONE_OPTIONS = ['light', 'dark'] as const satisfies readonly SlideTextTone[]
  const MAX_BACKGROUND_IMAGE_BYTES = 2_500_000
  const DRAG_START_THRESHOLD_PX = 4
  const SNAP_THRESHOLD_PERCENT = 1.15

  const stageRef = ref<HTMLElement | null>(null)
  const overlayRef = ref<HTMLElement | null>(null)
  const overlayEnteredFullscreen = ref(false)
  const notationOverlayOpen = ref(false)
  const selectedElementId = ref<string | null>(null)
  const rightPanel = ref<'editor' | 'notes'>('editor')
  const search = ref('')
  const slideContextMenu = ref<{ x: number; y: number; slideId: string } | null>(null)
  const snapGuides = ref<{ x: number[]; y: number[] }>({ x: [], y: [] })

  const currentDeck = computed(() => notations.currentDeck)
  const currentSlide = computed(() => notations.currentSlide)
  const currentSlideNumber = computed(() => Math.max(0, notations.currentSlideIndex) + 1)
  const selectedElement = computed(() => {
    const slide = currentSlide.value
    if (!slide || !selectedElementId.value) return null
    return slide.elements.find((element) => element.id === selectedElementId.value) ?? null
  })

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return notes.notes
    return notes.notes.filter(
      (n) =>
        n.verseRef.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  const slideCountLabel = computed(() => {
    const count = currentDeck.value?.slides.length ?? 0
    return `${count} slide${count === 1 ? '' : 's'}`
  })
  const contextSlide = computed(() => {
    const deck = currentDeck.value
    if (!deck || !slideContextMenu.value) return null
    return deck.slides.find((slide) => slide.verseRef === slideContextMenu.value?.slideId) ?? null
  })
  const contextSlideIndex = computed(() => {
    const deck = currentDeck.value
    if (!deck || !contextSlide.value) return -1
    return deck.slides.findIndex((slide) => slide.verseRef === contextSlide.value?.verseRef)
  })
  const slideContextMenuItems = computed(() => {
    const deck = currentDeck.value
    const index = contextSlideIndex.value
    const slideCount = deck?.slides.length ?? 0
    return [
      { id: 'duplicate', label: 'Duplicate' },
      { id: 'move-top', label: 'Move to top', disabled: index <= 0 },
      {
        id: 'move-bottom',
        label: 'Move to bottom',
        disabled: index === -1 || index >= slideCount - 1,
      },
      {
        id: 'delete',
        label: 'Delete',
        disabled: slideCount <= 1,
        destructive: true,
        separatorBefore: true,
      },
    ]
  })

  onMounted(() => {
    void notes.fetchMyNotes()
    document.addEventListener('fullscreenchange', onFullscreenChange)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    window.removeEventListener('keydown', handleNotationOverlayKeydown)
    stopElementDrag()
    verseAbortController?.abort()
  })

  watch(
    () => currentSlide.value?.verseRef,
    () => {
      const slide = currentSlide.value
      selectedElementId.value = slide?.elements[0]?.id ?? null
    },
    { immediate: true }
  )

  watch(
    () => notationOverlayOpen.value,
    async (open) => {
      if (open) {
        window.addEventListener('keydown', handleNotationOverlayKeydown)
        overlayEnteredFullscreen.value = false
        await nextTick()
        try {
          await overlayRef.value?.requestFullscreen?.()
          overlayEnteredFullscreen.value = document.fullscreenElement === overlayRef.value
        } catch {
          /* fullscreen can be blocked by the browser */
        }
        overlayRef.value?.focus()
      } else if (document.fullscreenElement === overlayRef.value) {
        window.removeEventListener('keydown', handleNotationOverlayKeydown)
        await document.exitFullscreen?.()
        overlayEnteredFullscreen.value = false
      } else {
        window.removeEventListener('keydown', handleNotationOverlayKeydown)
      }
    }
  )

  function onFullscreenChange() {
    const wasFullscreen = overlayEnteredFullscreen.value
    overlayEnteredFullscreen.value = document.fullscreenElement === overlayRef.value
    if (wasFullscreen && !overlayEnteredFullscreen.value && notationOverlayOpen.value) {
      void handleCloseDisplay()
    }
  }

  function selectSlide(slide: NotationSlide) {
    notations.selectSlide(slide.verseRef)
  }

  function openSlideContextMenu(event: MouseEvent, slide: NotationSlide) {
    event.preventDefault()
    selectedElementId.value = null
    selectSlide(slide)
    slideContextMenu.value = { x: event.clientX, y: event.clientY, slideId: slide.verseRef }
  }

  function closeSlideContextMenu() {
    slideContextMenu.value = null
  }

  function addSlide() {
    const slide = notations.addSlide()
    selectedElementId.value = null
    toast.success('Slide added', slide.title)
  }

  function duplicateCurrentSlide() {
    if (!currentSlide.value) return
    const slide = notations.duplicateSlide(currentSlide.value.verseRef)
    if (slide) toast.success('Slide duplicated', slide.title)
  }

  function duplicateSlide(slideId: string) {
    const slide = notations.duplicateSlide(slideId)
    if (slide) toast.success('Slide duplicated', slide.title)
  }

  function removeCurrentSlide() {
    if (!currentSlide.value) return
    removeSlide(currentSlide.value.verseRef)
  }

  function removeSlide(slideId: string) {
    notations.removeSlide(slideId)
    selectedElementId.value = currentSlide.value?.elements[0]?.id ?? null
  }

  function moveSlideToTop(slideId: string) {
    const slide = notations.moveSlide(slideId, 0)
    if (slide) toast.success('Slide moved', 'Moved to top')
  }

  function moveSlideToBottom(slideId: string) {
    const deck = currentDeck.value
    if (!deck) return
    const slide = notations.moveSlide(slideId, deck.slides.length - 1)
    if (slide) toast.success('Slide moved', 'Moved to bottom')
  }

  function handleSlideContextAction(action: string) {
    const slideId = slideContextMenu.value?.slideId
    closeSlideContextMenu()
    if (!slideId) return

    switch (action) {
      case 'duplicate':
        duplicateSlide(slideId)
        break
      case 'move-top':
        moveSlideToTop(slideId)
        break
      case 'move-bottom':
        moveSlideToBottom(slideId)
        break
      case 'delete':
        removeSlide(slideId)
        break
    }
  }

  function addTextBlock(text = 'New text block') {
    const element = notations.addTextElement(text)
    selectedElementId.value = element.id
    rightPanel.value = 'editor'
  }

  function addNoteToSlide(note: VerseNote) {
    addTextBlock(`${note.verseRef}\n${note.content}`)
  }

  function duplicateSelectedElement() {
    if (!currentSlide.value || !selectedElement.value) return
    const clone = notations.duplicateElement(currentSlide.value.verseRef, selectedElement.value.id)
    if (clone) selectedElementId.value = clone.id
  }

  function removeSelectedElement() {
    if (!currentSlide.value || !selectedElement.value) return
    notations.removeElement(currentSlide.value.verseRef, selectedElement.value.id)
    selectedElementId.value = currentSlide.value.elements[0]?.id ?? null
  }

  function updateSlideTitle(title: string) {
    if (!currentSlide.value) return
    notations.updateSlide(currentSlide.value.verseRef, { title })
  }

  function updateDeckTitle(title: string) {
    notations.updateDeckTitle(title)
  }

  function setSlidePreset(background: SlideBackground) {
    if (!currentSlide.value) return
    notations.updateSlide(currentSlide.value.verseRef, { background })
  }

  function updateSlideBackground(patch: Partial<SlideBackground>) {
    if (!currentSlide.value) return
    notations.updateSlide(currentSlide.value.verseRef, {
      background: { ...currentSlide.value.background, ...patch },
    })
  }

  function readImageAsDataUrl(file: File): Promise<string> {
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

  async function importSlideBackground(event: Event) {
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
      const dataUrl = await readImageAsDataUrl(file)
      updateSlideBackground({ type: 'image', value: dataUrl, textTone: 'light' })
      toast.success('Background imported', file.name)
    } catch (error) {
      toast.error('Background not imported', error instanceof Error ? error.message : undefined)
    }
  }

  function updateSelectedElement(patch: Partial<NotationElement>) {
    if (!currentSlide.value || !selectedElement.value) return
    notations.updateElement(currentSlide.value.verseRef, selectedElement.value.id, patch)
  }

  function updateSelectedText(value: string) {
    const element = selectedElement.value
    if (!element) return
    updateSelectedElement({ text: value })
  }

  function updateSelectedReference(value: string) {
    if (selectedElement.value?.kind !== 'verse') return
    updateSelectedElement({ reference: value })
  }

  function updateFontSize(value: string) {
    updateSelectedElement({ fontSize: Number(value) })
  }

  function updateWeight(value: NotationTextWeight) {
    updateSelectedElement({ fontWeight: value })
  }

  function updateAlignment(value: NotationTextAlign) {
    updateSelectedElement({ align: value })
  }

  function updateShowReference(value: boolean) {
    updateSelectedElement({ showReference: value })
  }

  interface DragState {
    elementId: string
    pointerId: number
    startX: number
    startY: number
    elementX: number
    elementY: number
    width: number
    height: number
    rect: DOMRect
    target: HTMLElement
    hasMoved: boolean
  }

  interface SnapCandidate {
    position: number
    guide: number
  }

  const dragState = ref<DragState | null>(null)

  function startElementDrag(event: PointerEvent, element: NotationElement) {
    const rect = stageRef.value?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    const target = event.currentTarget as HTMLElement
    try {
      target.setPointerCapture?.(event.pointerId)
    } catch {
      // Some browsers throw if capture is requested after the pointer is already released.
    }
    selectedElementId.value = element.id
    dragState.value = {
      elementId: element.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      elementX: element.x,
      elementY: element.y,
      width: element.width,
      height: element.height,
      rect,
      target,
      hasMoved: false,
    }
    addDragListeners()
  }

  function moveElement(event: PointerEvent) {
    const drag = dragState.value
    const slide = currentSlide.value
    if (!drag || !slide) return
    if (event.pointerId !== drag.pointerId) return
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
    if (!drag.hasMoved && distance < DRAG_START_THRESHOLD_PX) return
    drag.hasMoved = true
    const dx = ((event.clientX - drag.startX) / drag.rect.width) * 100
    const dy = ((event.clientY - drag.startY) / drag.rect.height) * 100
    const snapped = event.altKey
      ? {
          x: clampPercent(drag.elementX + dx, 0, 100 - drag.width),
          y: clampPercent(drag.elementY + dy, 0, 100 - drag.height),
          guides: { x: [], y: [] },
        }
      : snapElementPosition(drag.elementX + dx, drag.elementY + dy, drag, slide)
    snapGuides.value = snapped.guides
    notations.updateElement(
      slide.verseRef,
      drag.elementId,
      {
        x: snapped.x,
        y: snapped.y,
      },
      { persist: false }
    )
  }

  function clampPercent(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
  }

  function snapElementPosition(
    rawX: number,
    rawY: number,
    drag: DragState,
    slide: NotationSlide
  ): { x: number; y: number; guides: { x: number[]; y: number[] } } {
    const otherElements = slide.elements.filter((element) => element.id !== drag.elementId)
    const xCandidates: SnapCandidate[] = [
      { position: 0, guide: 0 },
      { position: 50 - drag.width / 2, guide: 50 },
      { position: 100 - drag.width, guide: 100 },
    ]
    const yCandidates: SnapCandidate[] = [
      { position: 0, guide: 0 },
      { position: 50 - drag.height / 2, guide: 50 },
      { position: 100 - drag.height, guide: 100 },
    ]

    for (const element of otherElements) {
      xCandidates.push(
        { position: element.x, guide: element.x },
        {
          position: element.x + element.width / 2 - drag.width / 2,
          guide: element.x + element.width / 2,
        },
        { position: element.x + element.width - drag.width, guide: element.x + element.width }
      )
      yCandidates.push(
        { position: element.y, guide: element.y },
        {
          position: element.y + element.height / 2 - drag.height / 2,
          guide: element.y + element.height / 2,
        },
        { position: element.y + element.height - drag.height, guide: element.y + element.height }
      )
    }

    const snappedX = snapCoordinate(rawX, drag.width, xCandidates)
    const snappedY = snapCoordinate(rawY, drag.height, yCandidates)
    return {
      x: snappedX.value,
      y: snappedY.value,
      guides: {
        x: snappedX.guide === null ? [] : [snappedX.guide],
        y: snappedY.guide === null ? [] : [snappedY.guide],
      },
    }
  }

  function snapCoordinate(
    rawValue: number,
    size: number,
    candidates: SnapCandidate[]
  ): { value: number; guide: number | null } {
    const clamped = clampPercent(rawValue, 0, 100 - size)
    let best: SnapCandidate | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const candidate of candidates) {
      const position = clampPercent(candidate.position, 0, 100 - size)
      const distance = Math.abs(clamped - position)
      if (distance < bestDistance) {
        best = { position, guide: clampPercent(candidate.guide, 0, 100) }
        bestDistance = distance
      }
    }

    if (best && bestDistance <= SNAP_THRESHOLD_PERCENT) {
      return { value: best.position, guide: best.guide }
    }

    return { value: clamped, guide: null }
  }

  function addDragListeners() {
    window.addEventListener('pointermove', moveElement, true)
    window.addEventListener('pointerup', stopElementDrag, true)
    window.addEventListener('pointercancel', stopElementDrag, true)
    window.addEventListener('blur', stopElementDrag)
    document.addEventListener('pointerup', stopElementDrag, true)
    document.addEventListener('pointercancel', stopElementDrag, true)
  }

  function removeDragListeners() {
    window.removeEventListener('pointermove', moveElement, true)
    window.removeEventListener('pointerup', stopElementDrag, true)
    window.removeEventListener('pointercancel', stopElementDrag, true)
    window.removeEventListener('blur', stopElementDrag)
    document.removeEventListener('pointerup', stopElementDrag, true)
    document.removeEventListener('pointercancel', stopElementDrag, true)
  }

  function stopElementDrag() {
    const drag = dragState.value
    if (drag) {
      try {
        if (drag.target.hasPointerCapture?.(drag.pointerId)) {
          drag.target.releasePointerCapture?.(drag.pointerId)
        }
      } catch {
        // The pointer may already be released by the browser.
      }
      if (drag.hasMoved) notations.persistCurrentDeck()
    }
    dragState.value = null
    snapGuides.value = { x: [], y: [] }
    removeDragListeners()
  }

  const verseRefInput = ref('')
  const verseError = ref('')
  const verseLoading = ref(false)
  let verseAbortController: AbortController | null = null

  interface ParsedVerseRef {
    bookShort: string
    bookName: string
    chapter: number
    verse: number
  }

  function parseVerseRef(input: string): ParsedVerseRef | null {
    const trimmed = input.trim()
    const dotted = trimmed.match(/^([1-3]?[A-Za-z]{2,4})\.(\d+)\.(\d+)$/)
    if (dotted) {
      const book = CANONICAL_BOOKS.find(
        (row) => row.shortName.toLowerCase() === dotted[1].toLowerCase()
      )
      if (!book) return null
      return {
        bookShort: book.shortName,
        bookName: book.longName,
        chapter: Number(dotted[2]),
        verse: Number(dotted[3]),
      }
    }

    const readable = trimmed.match(/^(.+?)\s+(\d+):(\d+)$/)
    if (!readable) return null
    const normalized = readable[1].replace(/\s+/g, ' ').trim().toLowerCase()
    const compact = normalized.replace(/\s+/g, '')
    const book = CANONICAL_BOOKS.find(
      (row) =>
        row.longName.toLowerCase() === normalized ||
        row.longName.toLowerCase().replace(/\s+/g, '') === compact ||
        row.shortName.toLowerCase() === normalized
    )
    if (!book) return null
    return {
      bookShort: book.shortName,
      bookName: book.longName,
      chapter: Number(readable[2]),
      verse: Number(readable[3]),
    }
  }

  async function insertVerse() {
    verseError.value = ''
    const parsed = parseVerseRef(verseRefInput.value)
    if (!parsed) {
      verseError.value = 'Use John 3:16 or JHN.3.16'
      return
    }

    verseAbortController?.abort()
    verseAbortController = new AbortController()
    verseLoading.value = true
    try {
      const translation = biblePrefs.translationApiCode(
        biblePrefs.effectivePresenterTranslationId()
      )
      const verse = await bibleService.getVerse(
        parsed.bookShort,
        parsed.chapter,
        parsed.verse,
        translation,
        verseAbortController.signal
      )
      const element = notations.addVerseElement({
        reference: `${parsed.bookName} ${parsed.chapter}:${parsed.verse}`,
        text: verse.text,
        translation,
      })
      selectedElementId.value = element.id
      rightPanel.value = 'editor'
      verseRefInput.value = ''
      toast.success('Verse inserted', `${parsed.bookName} ${parsed.chapter}:${parsed.verse}`)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      verseError.value = error instanceof Error ? error.message : 'Could not load that verse'
    } finally {
      verseLoading.value = false
    }
  }

  function loadDeckIntoPresenter() {
    const slides = notations.slidesForPresenter()
    if (slides.length === 0) return
    presenter.loadSlides(slides, null, Math.max(0, notations.currentSlideIndex))
    toast.success('Notations loaded', `${slides.length} slides ready to present`)
  }

  async function presentDeck() {
    const slides = notations.slidesForNotationPresentation()
    if (slides.length === 0) return
    presenter.loadSlides(slides, null, Math.max(0, notations.currentSlideIndex), {
      clearOnDisplayClose: true,
    })
    if (isTauri) {
      try {
        await presenter.openDisplayWindow(selectedMonitorIndex.value)
        toast.success('Display opened', monitors.value[selectedMonitorIndex.value]?.name)
        return
      } catch {
        toast.warning('Display unavailable', 'Showing the notations on this screen.')
      }
    }
    notationOverlayOpen.value = true
  }

  function shareCurrentDeck() {
    const deck = currentDeck.value
    if (!deck) return
    void router.push({
      name: 'community',
      query: { compose: 'notationDeck', deckId: deck.id },
    })
  }

  async function handleCloseDisplay() {
    notationOverlayOpen.value = false
    await presenter.closeDisplayWindow()
    if (document.fullscreenElement) await document.exitFullscreen?.()
  }

  function handleNotationOverlayKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || !notationOverlayOpen.value) return

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

  const showCreate = ref(false)
  const newContent = ref('')
  const newVerseRef = ref('')
  const newTags = ref('')
  const newIsShared = ref(false)
  const newVerseRefError = ref('')

  const editNote = ref<VerseNote | null>(null)
  const editContent = ref('')
  const editTags = ref('')
  const editIsShared = ref(false)
  const pendingDeleteId = ref<string | null>(null)

  function openEdit(note: VerseNote) {
    editNote.value = note
    editContent.value = note.content
    editTags.value = note.tags.join(', ')
    editIsShared.value = note.isShared
  }

  function closeEdit() {
    editNote.value = null
  }

  async function saveEdit() {
    if (!editNote.value || !editContent.value.trim()) return
    try {
      await notes.update(editNote.value.id, {
        content: editContent.value.trim(),
        tags: editTags.value
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isShared: editIsShared.value,
      })
      toast.success('Note updated')
      closeEdit()
      rightPanel.value = 'notes'
    } catch {
      toast.error('Could not update note', notes.error ?? undefined)
    }
  }

  function confirmDelete(id: string) {
    pendingDeleteId.value = id
  }

  async function executeDelete() {
    if (!pendingDeleteId.value) return
    try {
      await notes.remove(pendingDeleteId.value)
      pendingDeleteId.value = null
      toast.success('Note deleted')
    } catch {
      pendingDeleteId.value = null
      toast.error('Could not delete note', notes.error ?? undefined)
    }
  }

  async function createNote() {
    newVerseRefError.value = ''
    if (!newContent.value.trim() || !newVerseRef.value.trim()) return
    if (!VERSE_REF_PATTERN.test(newVerseRef.value.trim())) {
      newVerseRefError.value = 'Use format BOOK.CHAPTER or BOOK.CHAPTER.VERSE (e.g. JHN.3.16)'
      return
    }
    try {
      await notes.create({
        verseRef: newVerseRef.value.trim(),
        content: newContent.value.trim(),
        tags: newTags.value
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isShared: newIsShared.value,
      })
      toast.success('Note saved')
      showCreate.value = false
      newContent.value = ''
      newVerseRef.value = ''
      newTags.value = ''
      newIsShared.value = false
      rightPanel.value = 'notes'
    } catch {
      toast.error('Could not save note', notes.error ?? undefined)
    }
  }
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0 min-h-0">
    <STopBar title="Notations" subtitle="Slide notes, verses, and church-ready summaries">
      <template #actions>
        <SButton variant="secondary" size="sm" @click="showCreate = true">
          <template #leading>
            <StickyNote class="h-3.5 w-3.5" />
          </template>
          New note
        </SButton>
        <SButton variant="secondary" size="sm" @click="loadDeckIntoPresenter">
          <template #leading>
            <FileText class="h-3.5 w-3.5" />
          </template>
          Load
        </SButton>
        <SButton variant="secondary" size="sm" @click="shareCurrentDeck">
          <template #leading>
            <Share2 class="h-3.5 w-3.5" />
          </template>
          Share
        </SButton>
        <label
          class="hidden items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2 py-1.5 text-xs text-ink-muted md:flex"
        >
          <Monitor class="h-3.5 w-3.5" />
          <select
            v-model.number="selectedMonitorIndex"
            aria-label="Notation output monitor"
            class="max-w-40 bg-transparent text-ink-strong outline-none"
            :disabled="monitorsLoading"
          >
            <option v-for="(monitor, index) in monitors" :key="index" :value="index">
              {{ monitor.name }}
            </option>
          </select>
        </label>
        <SButton size="sm" variant="primary" @click="presentDeck">
          <template #leading>
            <ExternalLink class="h-3.5 w-3.5" />
          </template>
          Present
        </SButton>
      </template>
    </STopBar>

    <div class="flex flex-1 min-h-0 overflow-hidden">
      <aside
        class="w-64 shrink-0 flex flex-col border-r border-line-subtle bg-surface-base/70 backdrop-blur-xl"
      >
        <div class="p-3 border-b border-line-subtle space-y-3">
          <SInput
            :model-value="currentDeck?.title"
            size="sm"
            label="Deck"
            placeholder="Sunday Notations"
            @update:model-value="updateDeckTitle"
          />
          <div class="flex items-center justify-between">
            <span class="text-xs text-ink-muted">{{ slideCountLabel }}</span>
            <div class="flex items-center gap-1">
              <SIconButton size="sm" label="New slide" @click="addSlide">
                <Plus class="h-3.5 w-3.5" />
              </SIconButton>
              <SIconButton size="sm" label="New deck" @click="notations.createDeck">
                <FileText class="h-3.5 w-3.5" />
              </SIconButton>
            </div>
          </div>
        </div>

        <div
          data-testid="notation-slide-list"
          class="flex flex-1 flex-col gap-2 overflow-y-auto p-2"
        >
          <button
            v-for="(slide, index) in currentDeck?.slides ?? []"
            :key="slide.verseRef"
            type="button"
            data-testid="notation-slide-card"
            :aria-label="`Slide ${index + 1}: ${slide.title} ${slide.text}`"
            :class="[
              'block w-full rounded-lg border p-2 text-left transition-colors',
              currentSlide?.verseRef === slide.verseRef
                ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/15'
                : 'border-line-subtle hover:border-line-strong hover:bg-surface-canvas',
            ]"
            @click="selectSlide(slide)"
            @contextmenu.prevent.stop="openSlideContextMenu($event, slide)"
          >
            <div class="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2">
              <span class="w-5 shrink-0 pt-0.5 text-[11px] text-ink-subtle tabular-nums">
                {{ index + 1 }}
              </span>
              <div class="min-w-0">
                <div
                  class="w-full aspect-video overflow-hidden rounded-md border border-white/15 bg-black"
                >
                  <SNotationSlideCanvas :slide="slide" mode="fill" />
                </div>
                <p class="mt-1.5 truncate text-xs font-medium leading-tight text-ink-strong">
                  {{ slide.title }}
                </p>
                <p class="mt-0.5 line-clamp-1 text-[11px] leading-tight text-ink-muted">
                  {{ slide.text || 'Blank slide' }}
                </p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <main class="flex min-w-0 flex-1 flex-col bg-surface-canvas">
        <div
          class="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line-subtle bg-surface-base/80 px-4"
        >
          <div class="flex items-center gap-1.5">
            <SButton size="sm" variant="secondary" @click="addTextBlock()">
              <template #leading>
                <Type class="h-3.5 w-3.5" />
              </template>
              Text
            </SButton>
            <form class="flex items-center gap-1.5" @submit.prevent="insertVerse">
              <SInput v-model="verseRefInput" size="sm" placeholder="John 3:16 or JHN.3.16">
                <template #leading>
                  <BookOpen class="h-3.5 w-3.5" />
                </template>
              </SInput>
              <SButton size="sm" variant="secondary" :loading="verseLoading" type="submit">
                Insert
              </SButton>
            </form>
          </div>
          <div class="flex items-center gap-1">
            <span class="mr-2 text-xs text-ink-muted">
              {{ currentSlideNumber }} / {{ currentDeck?.slides.length ?? 0 }}
            </span>
            <SIconButton size="sm" label="Duplicate slide" @click="duplicateCurrentSlide">
              <Copy class="h-3.5 w-3.5" />
            </SIconButton>
            <SIconButton size="sm" label="Delete slide" @click="removeCurrentSlide">
              <Trash2 class="h-3.5 w-3.5 text-red-500" />
            </SIconButton>
          </div>
        </div>

        <div
          v-if="verseError"
          class="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700"
        >
          {{ verseError }}
        </div>

        <div class="flex-1 overflow-auto p-5">
          <div class="mx-auto max-w-6xl">
            <div
              v-if="currentSlide"
              ref="stageRef"
              class="notation-editor-stage relative aspect-video overflow-hidden rounded-lg border border-white/15 shadow-modal"
            >
              <SNotationSlideCanvas
                :slide="currentSlide"
                mode="fill"
                interactive
                :selected-element-id="selectedElementId"
                @canvas-pointer-down="selectedElementId = null"
                @element-pointer-down="startElementDrag"
              />
              <div
                v-if="snapGuides.x.length || snapGuides.y.length"
                class="pointer-events-none absolute inset-0 z-20"
                aria-hidden="true"
              >
                <span
                  v-for="x in snapGuides.x"
                  :key="`snap-x-${x}`"
                  class="absolute bottom-0 top-0 w-px bg-brand-300/90 shadow-[0_0_0_1px_rgba(59,107,255,0.35)]"
                  :style="{ left: `${x}%` }"
                />
                <span
                  v-for="y in snapGuides.y"
                  :key="`snap-y-${y}`"
                  class="absolute left-0 right-0 h-px bg-brand-300/90 shadow-[0_0_0_1px_rgba(59,107,255,0.35)]"
                  :style="{ top: `${y}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside
        class="w-80 shrink-0 overflow-y-auto border-l border-line-subtle bg-surface-base/80 backdrop-blur-xl"
      >
        <div class="flex border-b border-line-subtle p-2 gap-1">
          <button
            :class="[
              'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              rightPanel === 'editor'
                ? 'bg-surface-raised text-ink-strong shadow-xs'
                : 'text-ink-muted hover:bg-surface-canvas hover:text-ink',
            ]"
            @click="rightPanel = 'editor'"
          >
            Editor
          </button>
          <button
            :class="[
              'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              rightPanel === 'notes'
                ? 'bg-surface-raised text-ink-strong shadow-xs'
                : 'text-ink-muted hover:bg-surface-canvas hover:text-ink',
            ]"
            @click="rightPanel = 'notes'"
          >
            Verse notes
          </button>
        </div>

        <div v-if="rightPanel === 'editor'" class="space-y-5 p-3">
          <section v-if="currentSlide" class="space-y-3">
            <div
              class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle"
            >
              <Palette class="h-3.5 w-3.5" />
              Slide
            </div>
            <SInput
              :model-value="currentSlide.title"
              label="Title"
              size="sm"
              @update:model-value="updateSlideTitle"
            />

            <div>
              <p class="mb-2 text-[11px] font-medium text-ink-muted">Background</p>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  v-for="preset in NOTATION_BACKGROUND_PRESETS"
                  :key="preset.id"
                  type="button"
                  class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-ink hover:bg-surface-canvas"
                  @click="setSlidePreset(preset.background)"
                >
                  <span
                    class="h-4 w-4 rounded border border-white/20"
                    :style="backgroundStyle(preset.background)"
                  />
                  {{ preset.label }}
                </button>
              </div>
            </div>

            <div class="space-y-2 rounded-lg border border-line-subtle p-2">
              <div class="flex items-center gap-2 text-[11px] font-medium text-ink-muted">
                <Image class="h-3.5 w-3.5" />
                Custom
              </div>
              <select
                :value="currentSlide.background.type"
                class="h-8 w-full rounded-md border border-line bg-surface-base px-2 text-xs text-ink-strong"
                @change="
                  updateSlideBackground({
                    type: ($event.target as HTMLSelectElement).value as SlideBackgroundType,
                  })
                "
              >
                <option value="solid">Solid</option>
                <option value="gradient">Gradient</option>
                <option value="motion">Motion gradient</option>
                <option value="image">Image URL</option>
              </select>
              <input
                :value="currentSlide.background.value"
                class="h-8 w-full rounded-md border border-line bg-surface-base px-2 text-xs text-ink-strong focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                aria-label="Slide background value"
                @input="updateSlideBackground({ value: ($event.target as HTMLInputElement).value })"
              />
              <label
                class="flex h-8 cursor-pointer items-center justify-center rounded-md border border-line bg-surface-raised px-2 text-xs font-medium text-ink-strong hover:bg-surface-canvas"
              >
                Import image
                <input
                  type="file"
                  accept="image/*"
                  class="sr-only"
                  @change="importSlideBackground"
                />
              </label>
              <div class="flex gap-1">
                <button
                  v-for="tone in TEXT_TONE_OPTIONS"
                  :key="tone"
                  type="button"
                  :class="[
                    'flex-1 rounded-md px-2 py-1.5 text-xs capitalize transition-colors',
                    currentSlide.background.textTone === tone
                      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                      : 'text-ink-muted hover:bg-surface-canvas',
                  ]"
                  @click="updateSlideBackground({ textTone: tone })"
                >
                  {{ tone }} text
                </button>
              </div>
            </div>
          </section>

          <section class="space-y-3 border-t border-line-subtle pt-4">
            <div class="flex items-center justify-between gap-2">
              <div
                class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle"
              >
                <Type class="h-3.5 w-3.5" />
                Element
              </div>
              <div v-if="selectedElement" class="flex items-center gap-1">
                <SIconButton size="sm" label="Duplicate element" @click="duplicateSelectedElement">
                  <Copy class="h-3.5 w-3.5" />
                </SIconButton>
                <SIconButton size="sm" label="Delete element" @click="removeSelectedElement">
                  <Trash2 class="h-3.5 w-3.5 text-red-500" />
                </SIconButton>
              </div>
            </div>

            <div v-if="selectedElement" class="space-y-3">
              <SInput
                v-if="selectedElement.kind === 'verse'"
                :model-value="selectedElement.reference"
                label="Reference"
                size="sm"
                @update:model-value="updateSelectedReference"
              />
              <STextarea
                :model-value="
                  selectedElement.kind === 'verse' ? selectedElement.text : selectedElement.text
                "
                label="Text"
                :rows="selectedElement.kind === 'verse' ? 5 : 4"
                @update:model-value="updateSelectedText"
              />
              <div>
                <label class="mb-1 block text-[11px] font-medium text-ink-muted"> Text size </label>
                <input
                  type="range"
                  min="18"
                  max="132"
                  :value="selectedElement.fontSize"
                  class="w-full"
                  @input="updateFontSize(($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="color"
                  :value="selectedElement.color"
                  class="h-8 w-full rounded-md border border-line bg-transparent"
                  aria-label="Element colour"
                  @input="
                    updateSelectedElement({
                      color: ($event.target as HTMLInputElement).value,
                    } as Partial<NotationElement>)
                  "
                />
                <button
                  type="button"
                  :class="[
                    'h-8 rounded-md border border-line px-3 text-xs font-semibold transition-colors',
                    selectedElement.fontWeight === 'bold'
                      ? 'bg-brand-500 text-white'
                      : 'text-ink hover:bg-surface-canvas',
                  ]"
                  @click="updateWeight(selectedElement.fontWeight === 'bold' ? 'regular' : 'bold')"
                >
                  B
                </button>
              </div>
              <div class="flex gap-1">
                <button
                  v-for="option in ALIGN_OPTIONS"
                  :key="option.value"
                  type="button"
                  :title="option.label"
                  :aria-label="option.label"
                  :class="[
                    'flex h-8 flex-1 items-center justify-center rounded-md border border-line transition-colors',
                    selectedElement.align === option.value
                      ? 'bg-brand-500 text-white'
                      : 'text-ink-muted hover:bg-surface-canvas hover:text-ink',
                  ]"
                  @click="updateAlignment(option.value)"
                >
                  <component :is="option.icon" class="h-3.5 w-3.5" />
                </button>
              </div>
              <label
                v-if="selectedElement.kind === 'verse'"
                class="flex items-center gap-2 rounded-md px-1 py-1 text-xs text-ink"
              >
                <input
                  type="checkbox"
                  :checked="selectedElement.showReference"
                  @change="updateShowReference(($event.target as HTMLInputElement).checked)"
                />
                Show reference
              </label>
            </div>

            <div v-else class="rounded-lg border border-dashed border-line p-4 text-center">
              <p class="text-sm font-medium text-ink-strong">No element selected</p>
              <p class="mt-1 text-xs text-ink-muted">Select a text or verse block on the slide.</p>
            </div>
          </section>
        </div>

        <div v-else class="p-3">
          <div class="mb-3">
            <SInput v-model="search" size="sm" placeholder="Search notes, verses, or tags">
              <template #leading>
                <Search class="h-3.5 w-3.5" />
              </template>
            </SInput>
          </div>

          <SSpinner v-if="notes.isLoading" size="sm" />

          <div v-else-if="notes.error" class="rounded-lg border border-red-200 bg-red-50 p-3">
            <p class="text-sm text-red-700">{{ notes.error }}</p>
          </div>

          <div
            v-else-if="filtered.length === 0"
            class="rounded-lg border border-dashed border-line p-5 text-center"
          >
            <StickyNote class="mx-auto h-5 w-5 text-ink-subtle" />
            <p class="mt-3 text-sm font-semibold text-ink-strong">No notes yet</p>
            <p class="mt-1 text-xs text-ink-muted">
              Verse notes you save can be added to notation slides.
            </p>
            <SButton class="mt-3" size="sm" @click="showCreate = true">
              Create your first note
            </SButton>
          </div>

          <div v-else class="space-y-2">
            <article
              v-for="note in filtered"
              :key="note.id"
              class="group rounded-lg border border-line-subtle bg-surface-raised p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300"
                  >
                    {{ note.verseRef }}
                  </p>
                  <p class="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {{ note.content }}
                  </p>
                  <div v-if="note.tags.length > 0" class="mt-2 flex flex-wrap gap-1">
                    <SChip v-for="tag in note.tags" :key="tag" tone="brand">
                      {{ tag }}
                    </SChip>
                  </div>
                </div>
                <div
                  class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <SIconButton size="sm" label="Add note to slide" @click="addNoteToSlide(note)">
                    <Plus class="h-3.5 w-3.5 text-ink-muted" />
                  </SIconButton>
                  <SIconButton size="sm" label="Edit note" @click="openEdit(note)">
                    <Pencil class="h-3.5 w-3.5 text-ink-muted" />
                  </SIconButton>
                  <SIconButton size="sm" label="Delete note" @click="confirmDelete(note.id)">
                    <Trash2 class="h-3.5 w-3.5 text-red-500" />
                  </SIconButton>
                </div>
              </div>
              <p class="mt-2 text-[11px] text-ink-subtle">
                {{ new Date(note.updatedAt).toLocaleDateString() }}
                <span v-if="note.isShared" class="ml-2 font-medium text-emerald-500">Shared</span>
              </p>
            </article>
          </div>
        </div>
      </aside>
    </div>

    <SContextMenu
      v-if="slideContextMenu"
      :x="slideContextMenu.x"
      :y="slideContextMenu.y"
      :title="contextSlide?.title ?? 'Slide actions'"
      :items="slideContextMenuItems"
      @select="handleSlideContextAction"
      @close="closeSlideContextMenu"
    />

    <Teleport to="body">
      <div
        v-if="notationOverlayOpen"
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
        <SPresenterSlide
          :slide="presenter.currentSlide"
          :slide-key="presenter.session.currentIndex"
          :blanked="presenter.isBlanked"
        />

        <div
          class="overlay-hud pointer-events-none absolute inset-x-0 bottom-6 flex items-center justify-between px-8"
        >
          <span class="font-sans text-[11px] tabular-nums text-slate-500">
            {{ presenter.session.currentIndex + 1 }} / {{ presenter.session.slides.length }}
          </span>
          <span class="font-sans text-[11px] text-slate-500">
            Click · ← → Space to advance · B to blank · Esc to close
          </span>
          <span
            v-if="presenter.isBlanked"
            class="pointer-events-auto font-sans text-[11px] font-semibold uppercase tracking-wider text-amber-500"
            @click.stop="presenter.toggleBlank()"
          >
            BLANKED
          </span>
          <span v-else class="font-sans text-[11px] text-transparent">&nbsp;</span>
        </div>

        <button
          class="overlay-hud pointer-events-auto absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
          @click.stop="handleCloseDisplay"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </Teleport>

    <SModal :open="showCreate" title="New note" size="md" @close="showCreate = false">
      <div class="space-y-3">
        <div>
          <SInput v-model="newVerseRef" label="Verse reference" placeholder="JHN.3.16" required />
          <p v-if="newVerseRefError" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ newVerseRefError }}
          </p>
          <p v-else class="mt-1 text-[11px] text-ink-subtle">
            Format:
            <code class="rounded bg-surface-canvas px-0.5 font-mono text-[10px]">BOOK.CHAPTER</code>
            or
            <code class="rounded bg-surface-canvas px-0.5 font-mono text-[10px]">
              BOOK.CHAPTER.VERSE
            </code>
          </p>
        </div>
        <STextarea
          v-model="newContent"
          label="Reflection"
          placeholder="Your note…"
          :rows="5"
          required
        />
        <SInput v-model="newTags" label="Tags" placeholder="faith, grace (comma separated)" />
        <SSwitch
          v-model="newIsShared"
          label="Share with community"
          description="Shared notes must pass community safety checks."
        />
      </div>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="showCreate = false"> Cancel </SButton>
        <SButton size="sm" :loading="notes.isSaving" @click="createNote"> Save note </SButton>
      </template>
    </SModal>

    <SModal :open="!!editNote" title="Edit note" size="md" @close="closeEdit">
      <div class="space-y-3">
        <p
          class="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300"
        >
          {{ editNote?.verseRef }}
        </p>
        <STextarea
          v-model="editContent"
          label="Reflection"
          placeholder="Your note…"
          :rows="5"
          required
        />
        <SInput v-model="editTags" label="Tags" placeholder="faith, grace (comma separated)" />
        <SSwitch
          v-model="editIsShared"
          label="Share with community"
          description="Shared notes must pass community safety checks."
        />
      </div>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="closeEdit"> Cancel </SButton>
        <SButton
          size="sm"
          :loading="notes.isSaving"
          :disabled="!editContent.trim()"
          @click="saveEdit"
        >
          Save changes
        </SButton>
      </template>
    </SModal>

    <SModal
      :open="!!pendingDeleteId"
      title="Delete note?"
      size="sm"
      @close="pendingDeleteId = null"
    >
      <p class="text-sm text-ink-muted">
        This note will be permanently deleted. This cannot be undone.
      </p>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="pendingDeleteId = null"> Cancel </SButton>
        <SButton variant="danger" size="sm" @click="executeDelete"> Delete </SButton>
      </template>
    </SModal>
  </div>
</template>

<style scoped>
  .notation-editor-stage {
    container-type: size;
  }

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
