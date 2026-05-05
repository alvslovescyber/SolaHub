import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  cloneBackground,
  DEFAULT_NOTATION_BACKGROUND,
  normalizeBackground,
  readableSlideColor,
} from '@/lib/presenterBackgrounds'
import { getStorageItem, writeJsonStorage } from '@/lib/safeStorage'
import type {
  NotationDeck,
  NotationElement,
  NotationSlide,
  NotationTextAlign,
  NotationTextElement,
  NotationTextWeight,
  NotationVerseElement,
  SlideBackground,
} from '@/types/presenter.types'

const STORAGE_KEY = 'solahub:notations:v1'
export const MAX_SLIDES = 80
export const MAX_ELEMENTS_PER_SLIDE = 24

let fallbackId = 0

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  fallbackId += 1
  return `${prefix}-${Date.now()}-${fallbackId}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function cleanText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, 8000) : fallback
}

function cleanAlign(value: unknown): NotationTextAlign {
  return value === 'center' || value === 'right' ? value : 'left'
}

function cleanWeight(value: unknown): NotationTextWeight {
  return value === 'medium' || value === 'bold' ? value : 'regular'
}

function summarizeSlide(slide: Pick<NotationSlide, 'elements' | 'title'>): string {
  const text = slide.elements
    .map((element) =>
      element.kind === 'verse' ? `${element.reference} ${element.text}` : element.text
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return (text || slide.title).slice(0, 260)
}

function sanitizeElement(
  raw: unknown,
  index: number,
  background: SlideBackground
): NotationElement {
  const row = raw && typeof raw === 'object' ? (raw as Partial<NotationElement>) : {}
  const kind = row.kind === 'verse' ? 'verse' : 'text'
  const base = {
    id: typeof row.id === 'string' ? row.id : createId('el'),
    x: clamp(Number(row.x ?? 12 + index * 2), 0, 94),
    y: clamp(Number(row.y ?? 14 + index * 7), 0, 92),
    width: clamp(Number(row.width ?? 76), 6, 100),
    height: clamp(Number(row.height ?? 16), 5, 100),
    fontSize: clamp(Number(row.fontSize ?? 48), 18, 132),
    color: cleanText(row.color, readableSlideColor(background.textTone)),
    align: cleanAlign(row.align),
    fontWeight: cleanWeight(row.fontWeight),
  }

  if (kind === 'verse') {
    const verse = row as Partial<NotationVerseElement>
    return {
      ...base,
      kind: 'verse',
      reference: cleanText(verse.reference, 'John 3:16'),
      text: cleanText(verse.text, 'For God so loved the world'),
      translation: cleanText(verse.translation, 'KJV'),
      showReference: verse.showReference !== false,
    }
  }

  const text = row as Partial<NotationTextElement>
  return {
    ...base,
    kind: 'text',
    text: cleanText(text.text, 'Meeting summary'),
  }
}

function makeStarterSlide(): NotationSlide {
  const background = cloneBackground(DEFAULT_NOTATION_BACKGROUND)
  const elements: NotationElement[] = [
    {
      id: createId('el'),
      kind: 'text',
      text: 'Meeting Summary',
      x: 10,
      y: 14,
      width: 80,
      height: 14,
      fontSize: 74,
      color: '#ffffff',
      align: 'center',
      fontWeight: 'bold',
    },
    {
      id: createId('el'),
      kind: 'text',
      text: 'Add key points, Scripture references, and next steps for the church.',
      x: 18,
      y: 40,
      width: 64,
      height: 18,
      fontSize: 42,
      color: '#dbeafe',
      align: 'center',
      fontWeight: 'regular',
    },
  ]

  return {
    source: 'notation',
    verseRef: createId('notation'),
    title: 'Summary',
    text: summarizeSlide({ title: 'Summary', elements }),
    background,
    elements,
  }
}

function makeStarterDeck(): NotationDeck {
  const createdAt = nowIso()
  return {
    id: createId('deck'),
    title: 'Sunday Notations',
    slides: [makeStarterSlide()],
    createdAt,
    updatedAt: createdAt,
  }
}

function sanitizeSlide(raw: unknown, index: number): NotationSlide {
  const row = raw && typeof raw === 'object' ? (raw as Partial<NotationSlide>) : {}
  const background = normalizeBackground(row.background)
  const elements = Array.isArray(row.elements)
    ? row.elements
        .slice(0, MAX_ELEMENTS_PER_SLIDE)
        .map((element, elementIndex) => sanitizeElement(element, elementIndex, background))
    : []
  const title = cleanText(row.title, `Slide ${index + 1}`).trim() || `Slide ${index + 1}`
  const slide = {
    source: 'notation' as const,
    verseRef: typeof row.verseRef === 'string' ? row.verseRef : createId('notation'),
    title,
    text: cleanText(row.text),
    background,
    elements,
  }

  slide.text = summarizeSlide(slide)
  return slide
}

function sanitizeDeck(raw: unknown): NotationDeck | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Partial<NotationDeck>
  const slides = Array.isArray(row.slides)
    ? row.slides.slice(0, MAX_SLIDES).map((slide, index) => sanitizeSlide(slide, index))
    : []

  if (slides.length === 0) slides.push(makeStarterSlide())

  return {
    id: typeof row.id === 'string' ? row.id : createId('deck'),
    title: cleanText(row.title, 'Sunday Notations').trim() || 'Sunday Notations',
    slides,
    createdAt: cleanText(row.createdAt, nowIso()),
    updatedAt: cleanText(row.updatedAt, nowIso()),
  }
}

function loadDecks(): NotationDeck[] {
  try {
    const raw = getStorageItem(STORAGE_KEY)
    if (!raw) return [makeStarterDeck()]
    const parsed = JSON.parse(raw) as unknown
    const decks = Array.isArray(parsed)
      ? parsed.map(sanitizeDeck).filter((deck): deck is NotationDeck => deck !== null)
      : []
    return decks.length > 0 ? decks : [makeStarterDeck()]
  } catch {
    return [makeStarterDeck()]
  }
}

function cloneSlide(slide: NotationSlide): NotationSlide {
  return {
    ...slide,
    background: cloneBackground(slide.background),
    elements: slide.elements.map((element) => ({ ...element })),
  }
}

function cloneDeck(deck: NotationDeck): NotationDeck {
  return {
    ...deck,
    slides: deck.slides.map(cloneSlide),
  }
}

export const useNotationsStore = defineStore('notations', () => {
  const decks = ref<NotationDeck[]>(loadDecks())
  const activeDeckId = ref(decks.value[0]?.id ?? null)
  const activeSlideId = ref(decks.value[0]?.slides[0]?.verseRef ?? null)

  const currentDeck = computed(
    () => decks.value.find((deck) => deck.id === activeDeckId.value) ?? decks.value[0] ?? null
  )

  const currentSlide = computed(() => {
    const deck = currentDeck.value
    if (!deck) return null
    return deck.slides.find((slide) => slide.verseRef === activeSlideId.value) ?? deck.slides[0]
  })

  const currentSlideIndex = computed(() => {
    const deck = currentDeck.value
    const slide = currentSlide.value
    if (!deck || !slide) return -1
    return deck.slides.findIndex((row) => row.verseRef === slide.verseRef)
  })

  function persist(): void {
    writeJsonStorage(STORAGE_KEY, decks.value)
  }

  function touch(deck: NotationDeck): void {
    deck.updatedAt = nowIso()
    persist()
  }

  function ensureDeck(): NotationDeck {
    if (currentDeck.value) return currentDeck.value
    const deck = makeStarterDeck()
    decks.value = [deck]
    activeDeckId.value = deck.id
    activeSlideId.value = deck.slides[0]?.verseRef ?? null
    persist()
    return deck
  }

  function createDeck(): void {
    const deck = makeStarterDeck()
    decks.value = [deck, ...decks.value]
    activeDeckId.value = deck.id
    activeSlideId.value = deck.slides[0]?.verseRef ?? null
    persist()
  }

  function updateDeckTitle(title: string): void {
    const deck = ensureDeck()
    deck.title = title.trim() || 'Untitled notations'
    touch(deck)
  }

  function selectSlide(slideId: string): void {
    activeSlideId.value = slideId
  }

  function addSlide(): NotationSlide {
    const deck = ensureDeck()
    if (deck.slides.length >= MAX_SLIDES) return deck.slides[deck.slides.length - 1]
    const index = currentSlideIndex.value === -1 ? deck.slides.length : currentSlideIndex.value + 1
    const slide = sanitizeSlide(
      {
        title: `Slide ${deck.slides.length + 1}`,
        background: currentSlide.value?.background ?? DEFAULT_NOTATION_BACKGROUND,
        elements: [],
      },
      deck.slides.length
    )

    deck.slides.splice(index, 0, slide)
    activeSlideId.value = slide.verseRef
    touch(deck)
    return slide
  }

  function duplicateSlide(slideId: string): NotationSlide | null {
    const deck = ensureDeck()
    if (deck.slides.length >= MAX_SLIDES) return null
    const index = deck.slides.findIndex((slide) => slide.verseRef === slideId)
    if (index === -1) return null

    const source = deck.slides[index]
    const clone = cloneSlide(source)
    clone.verseRef = createId('notation')
    clone.title = `${source.title} copy`
    clone.elements = clone.elements.map((element) => ({ ...element, id: createId('el') }))
    deck.slides.splice(index + 1, 0, clone)
    activeSlideId.value = clone.verseRef
    touch(deck)
    return clone
  }

  function moveSlide(slideId: string, targetIndex: number): NotationSlide | null {
    const deck = ensureDeck()
    const fromIndex = deck.slides.findIndex((slide) => slide.verseRef === slideId)
    if (fromIndex === -1) return null

    const nextIndex = clamp(Math.trunc(targetIndex), 0, deck.slides.length - 1)
    if (fromIndex === nextIndex) return deck.slides[fromIndex]

    const [slide] = deck.slides.splice(fromIndex, 1)
    deck.slides.splice(nextIndex, 0, slide)
    activeSlideId.value = slide.verseRef
    touch(deck)
    return slide
  }

  function removeSlide(slideId: string): void {
    const deck = ensureDeck()
    if (deck.slides.length <= 1) return
    const index = deck.slides.findIndex((slide) => slide.verseRef === slideId)
    if (index === -1) return
    deck.slides.splice(index, 1)
    activeSlideId.value =
      deck.slides[Math.max(0, index - 1)]?.verseRef ?? deck.slides[0]?.verseRef ?? null
    touch(deck)
  }

  function updateSlide(
    slideId: string,
    patch: Partial<Pick<NotationSlide, 'title' | 'background'>>
  ): void {
    const deck = ensureDeck()
    const slide = deck.slides.find((row) => row.verseRef === slideId)
    if (!slide) return
    if (patch.title !== undefined) slide.title = patch.title.trim() || 'Untitled slide'
    if (patch.background !== undefined) slide.background = normalizeBackground(patch.background)
    slide.text = summarizeSlide(slide)
    touch(deck)
  }

  function updateElement(
    slideId: string,
    elementId: string,
    patch: Partial<NotationElement>,
    options: { persist?: boolean } = {}
  ): void {
    const deck = ensureDeck()
    const slide = deck.slides.find((row) => row.verseRef === slideId)
    const element = slide?.elements.find((row) => row.id === elementId)
    if (!slide || !element) return

    Object.assign(element, patch)
    element.x = clamp(Number(element.x), 0, 100 - Math.max(4, Number(element.width)))
    element.y = clamp(Number(element.y), 0, 100 - Math.max(4, Number(element.height)))
    element.width = clamp(Number(element.width), 6, 100)
    element.height = clamp(Number(element.height), 5, 100)
    element.fontSize = clamp(Number(element.fontSize), 18, 132)
    slide.text = summarizeSlide(slide)
    if (options.persist !== false) touch(deck)
  }

  function persistCurrentDeck(): void {
    const deck = currentDeck.value
    if (deck) touch(deck)
  }

  function addTextElement(text = 'New text block'): NotationTextElement | null {
    const deck = ensureDeck()
    const slide = currentSlide.value ?? addSlide()
    if (slide.elements.length >= MAX_ELEMENTS_PER_SLIDE) return null
    const element: NotationTextElement = {
      id: createId('el'),
      kind: 'text',
      text,
      x: 14,
      y: 18 + Math.min(slide.elements.length * 9, 38),
      width: 72,
      height: 16,
      fontSize: 48,
      color: readableSlideColor(slide.background.textTone),
      align: 'left',
      fontWeight: 'regular',
    }
    slide.elements.push(element)
    slide.text = summarizeSlide(slide)
    touch(deck)
    return element
  }

  function addVerseElement(input: {
    reference: string
    text: string
    translation: string
  }): NotationVerseElement | null {
    const deck = ensureDeck()
    const slide = currentSlide.value ?? addSlide()
    if (slide.elements.length >= MAX_ELEMENTS_PER_SLIDE) return null
    const element: NotationVerseElement = {
      id: createId('el'),
      kind: 'verse',
      reference: input.reference,
      text: input.text,
      translation: input.translation,
      showReference: true,
      x: 12,
      y: 24 + Math.min(slide.elements.length * 8, 38),
      width: 76,
      height: 24,
      fontSize: 42,
      color: readableSlideColor(slide.background.textTone),
      align: 'center',
      fontWeight: 'regular',
    }
    slide.elements.push(element)
    slide.text = summarizeSlide(slide)
    touch(deck)
    return element
  }

  function duplicateElement(slideId: string, elementId: string): NotationElement | null {
    const deck = ensureDeck()
    const slide = deck.slides.find((row) => row.verseRef === slideId)
    const element = slide?.elements.find((row) => row.id === elementId)
    if (!slide || !element) return null
    if (slide.elements.length >= MAX_ELEMENTS_PER_SLIDE) return null

    const clone: NotationElement = {
      ...element,
      id: createId('el'),
      x: clamp(element.x + 3, 0, 100 - element.width),
      y: clamp(element.y + 3, 0, 100 - element.height),
    }
    slide.elements.push(clone)
    slide.text = summarizeSlide(slide)
    touch(deck)
    return clone
  }

  function removeElement(slideId: string, elementId: string): void {
    const deck = ensureDeck()
    const slide = deck.slides.find((row) => row.verseRef === slideId)
    if (!slide) return
    slide.elements = slide.elements.filter((element) => element.id !== elementId)
    slide.text = summarizeSlide(slide)
    touch(deck)
  }

  function slidesForNotationPresentation(): NotationSlide[] {
    return currentDeck.value?.slides.map(cloneSlide) ?? []
  }

  function slidesForPresenter(): NotationSlide[] {
    return currentDeck.value?.slides.map(cloneSlide) ?? []
  }

  function exportDeck(): NotationDeck | null {
    return currentDeck.value ? cloneDeck(currentDeck.value) : null
  }

  return {
    decks,
    activeDeckId,
    activeSlideId,
    currentDeck,
    currentSlide,
    currentSlideIndex,
    createDeck,
    updateDeckTitle,
    selectSlide,
    addSlide,
    duplicateSlide,
    moveSlide,
    removeSlide,
    updateSlide,
    updateElement,
    persistCurrentDeck,
    addTextElement,
    addVerseElement,
    duplicateElement,
    removeElement,
    slidesForNotationPresentation,
    slidesForPresenter,
    exportDeck,
  }
})
