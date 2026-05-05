import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import { defineStore } from 'pinia'
import { BIBLE_TRANSLATION_CATALOG } from '@/constants/bibleTranslations'
import { getStorageItem, writeJsonStorage } from '@/lib/safeStorage'

const STORAGE_KEY = 'solahub:bible-preferences'

export type PresenterFontScale = 'comfortable' | 'large' | 'auditorium'
export type PresenterBackground = 'black' | 'navy' | 'gradient' | 'warm' | 'forest' | 'custom'
export type SongsIntegrationPlaceholder = 'none' | 'planning_center' | 'song_select' | 'openlp'
export type ReaderFontScale = 's' | 'm' | 'l'
export type ReaderLineHeight = 'compact' | 'normal' | 'relaxed'
export type ReaderPaper = 'white' | 'sepia' | 'muted'

interface Persisted {
  defaultTranslationId: string
  installedTranslationIds: string[]
  parallelTranslationId: string | null
  presenterUseSeparateTranslation: boolean
  presenterTranslationId: string | null
  presenterFontScale: PresenterFontScale
  presenterShowVerseRef: boolean
  presenterBackground: PresenterBackground
  presenterCustomBackground: string
  songsShowCopyright: boolean
  songsIntegration: SongsIntegrationPlaceholder
  readerFontScale: ReaderFontScale
  readerLineHeight: ReaderLineHeight
  readerPaper: ReaderPaper
}

const DEFAULTS: Persisted = {
  defaultTranslationId: 'kjv',
  installedTranslationIds: ['kjv', 'web'],
  parallelTranslationId: null,
  presenterUseSeparateTranslation: false,
  presenterTranslationId: null,
  presenterFontScale: 'comfortable',
  presenterShowVerseRef: true,
  presenterBackground: 'black',
  presenterCustomBackground: 'linear-gradient(135deg, #111827 0%, #334155 58%, #0f766e 100%)',
  songsShowCopyright: true,
  songsIntegration: 'none',
  readerFontScale: 'm',
  readerLineHeight: 'normal',
  readerPaper: 'white',
}

function validCatalogId(id: string): boolean {
  return BIBLE_TRANSLATION_CATALOG.some((t) => t.id === id.toLowerCase())
}

function normalizeInstalled(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [...DEFAULTS.installedTranslationIds]
  const cleaned = [...new Set(ids.map((x) => String(x).toLowerCase()).filter(validCatalogId))]
  return cleaned.length > 0 ? cleaned : [...DEFAULTS.installedTranslationIds]
}

function load(): Persisted {
  try {
    const raw = getStorageItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const p = JSON.parse(raw) as Partial<Persisted>
    const installed = normalizeInstalled(p.installedTranslationIds)
    let defaultTranslationId = String(
      p.defaultTranslationId ?? DEFAULTS.defaultTranslationId
    ).toLowerCase()
    if (!installed.includes(defaultTranslationId)) defaultTranslationId = installed[0]

    let presenterTranslationId =
      p.presenterTranslationId === null || p.presenterTranslationId === undefined
        ? null
        : String(p.presenterTranslationId).toLowerCase()
    if (presenterTranslationId && !installed.includes(presenterTranslationId)) {
      presenterTranslationId = null
    }

    let parallelTranslationId =
      p.parallelTranslationId === null || p.parallelTranslationId === undefined
        ? null
        : String(p.parallelTranslationId).toLowerCase()
    if (
      parallelTranslationId &&
      (!installed.includes(parallelTranslationId) || parallelTranslationId === defaultTranslationId)
    ) {
      parallelTranslationId = null
    }

    const presenterFontScale = (
      ['comfortable', 'large', 'auditorium'].includes(String(p.presenterFontScale))
        ? p.presenterFontScale
        : DEFAULTS.presenterFontScale
    ) as PresenterFontScale

    const presenterBackground = (
      ['black', 'navy', 'gradient', 'warm', 'forest', 'custom'].includes(
        String(p.presenterBackground)
      )
        ? p.presenterBackground
        : DEFAULTS.presenterBackground
    ) as PresenterBackground

    const presenterCustomBackground =
      typeof p.presenterCustomBackground === 'string' && p.presenterCustomBackground.trim()
        ? p.presenterCustomBackground.trim()
        : DEFAULTS.presenterCustomBackground

    const songsIntegration = (
      ['none', 'planning_center', 'song_select', 'openlp'].includes(String(p.songsIntegration))
        ? p.songsIntegration
        : DEFAULTS.songsIntegration
    ) as SongsIntegrationPlaceholder

    const readerFontScale = (
      ['s', 'm', 'l'].includes(String(p.readerFontScale))
        ? p.readerFontScale
        : DEFAULTS.readerFontScale
    ) as ReaderFontScale

    const readerLineHeight = (
      ['compact', 'normal', 'relaxed'].includes(String(p.readerLineHeight))
        ? p.readerLineHeight
        : DEFAULTS.readerLineHeight
    ) as ReaderLineHeight

    const readerPaper = (
      ['white', 'sepia', 'muted'].includes(String(p.readerPaper))
        ? p.readerPaper
        : DEFAULTS.readerPaper
    ) as ReaderPaper

    return {
      defaultTranslationId,
      installedTranslationIds: installed,
      parallelTranslationId,
      presenterUseSeparateTranslation: Boolean(p.presenterUseSeparateTranslation),
      presenterTranslationId,
      presenterFontScale,
      presenterShowVerseRef: p.presenterShowVerseRef !== false,
      presenterBackground,
      presenterCustomBackground,
      songsShowCopyright: p.songsShowCopyright !== false,
      songsIntegration,
      readerFontScale,
      readerLineHeight,
      readerPaper,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function save(state: Persisted): void {
  writeJsonStorage(STORAGE_KEY, state)
}

export const useBiblePreferencesStore = defineStore('biblePreferences', () => {
  const initial = load()

  const defaultTranslationId = ref(initial.defaultTranslationId)
  const installedTranslationIds = ref<string[]>(initial.installedTranslationIds)
  const parallelTranslationId = ref<string | null>(initial.parallelTranslationId)
  const presenterUseSeparateTranslation = ref(initial.presenterUseSeparateTranslation)
  const presenterTranslationId = ref<string | null>(initial.presenterTranslationId)
  const presenterFontScale = ref<PresenterFontScale>(initial.presenterFontScale)
  const presenterShowVerseRef = ref(initial.presenterShowVerseRef)
  const presenterBackground = ref<PresenterBackground>(initial.presenterBackground)
  const presenterCustomBackground = ref(initial.presenterCustomBackground)
  const songsShowCopyright = ref(initial.songsShowCopyright)
  const songsIntegration = ref<SongsIntegrationPlaceholder>(initial.songsIntegration)
  const readerFontScale = ref<ReaderFontScale>(initial.readerFontScale)
  const readerLineHeight = ref<ReaderLineHeight>(initial.readerLineHeight)
  const readerPaper = ref<ReaderPaper>(initial.readerPaper)

  function persist(): void {
    save({
      defaultTranslationId: defaultTranslationId.value,
      installedTranslationIds: [...installedTranslationIds.value],
      parallelTranslationId: parallelTranslationId.value,
      presenterUseSeparateTranslation: presenterUseSeparateTranslation.value,
      presenterTranslationId: presenterTranslationId.value,
      presenterFontScale: presenterFontScale.value,
      presenterShowVerseRef: presenterShowVerseRef.value,
      presenterBackground: presenterBackground.value,
      presenterCustomBackground: presenterCustomBackground.value,
      songsShowCopyright: songsShowCopyright.value,
      songsIntegration: songsIntegration.value,
      readerFontScale: readerFontScale.value,
      readerLineHeight: readerLineHeight.value,
      readerPaper: readerPaper.value,
    })
  }

  const installedSelectOptions = computed(() =>
    installedTranslationIds.value.map((id) => {
      const row = BIBLE_TRANSLATION_CATALOG.find((t) => t.id === id)
      return {
        label: row ? `${row.name} (${row.language})` : id.toUpperCase(),
        value: id,
      }
    })
  )

  function translationApiCode(id: string): string {
    return id.toUpperCase()
  }

  function effectivePresenterTranslationId(): string {
    if (presenterUseSeparateTranslation.value && presenterTranslationId.value) {
      return presenterTranslationId.value
    }
    return defaultTranslationId.value
  }

  function setDefaultTranslation(id: string): void {
    const slug = id.toLowerCase()
    if (!installedTranslationIds.value.includes(slug)) return
    defaultTranslationId.value = slug
    persist()
  }

  function installTranslation(id: string): void {
    const slug = id.toLowerCase()
    if (!validCatalogId(slug) || installedTranslationIds.value.includes(slug)) return
    installedTranslationIds.value = [...installedTranslationIds.value, slug]
    persist()
  }

  function removeTranslation(id: string): void {
    const slug = id.toLowerCase()
    if (!installedTranslationIds.value.includes(slug)) return
    if (installedTranslationIds.value.length <= 1) return
    if (slug === defaultTranslationId.value) return
    installedTranslationIds.value = installedTranslationIds.value.filter((x) => x !== slug)
    if (parallelTranslationId.value === slug) parallelTranslationId.value = null
    if (presenterTranslationId.value === slug) presenterTranslationId.value = null
    persist()
  }

  function setParallelTranslation(id: string | null): void {
    if (id === null) {
      parallelTranslationId.value = null
      persist()
      return
    }
    const slug = id.toLowerCase()
    if (!installedTranslationIds.value.includes(slug) || slug === defaultTranslationId.value) return
    parallelTranslationId.value = slug
    persist()
  }

  function setPresenterUseSeparate(on: boolean): void {
    presenterUseSeparateTranslation.value = on
    persist()
  }

  function setPresenterTranslation(id: string | null): void {
    if (id === null) {
      presenterTranslationId.value = null
      persist()
      return
    }
    const slug = id.toLowerCase()
    if (!installedTranslationIds.value.includes(slug)) return
    presenterTranslationId.value = slug
    persist()
  }

  function setPresenterFontScale(v: PresenterFontScale): void {
    presenterFontScale.value = v
    persist()
  }

  function setPresenterShowVerseRef(on: boolean): void {
    presenterShowVerseRef.value = on
    persist()
  }

  function setPresenterBackground(v: PresenterBackground): void {
    presenterBackground.value = v
    persist()
  }

  function setPresenterCustomBackground(v: string): void {
    const next = v.trim()
    if (!next) return
    presenterCustomBackground.value = next.slice(0, 500)
    persist()
  }

  function setSongsShowCopyright(on: boolean): void {
    songsShowCopyright.value = on
    persist()
  }

  function setSongsIntegration(v: SongsIntegrationPlaceholder): void {
    songsIntegration.value = v
    persist()
  }

  function setReaderFontScale(v: ReaderFontScale): void {
    readerFontScale.value = v
    persist()
  }

  function setReaderLineHeight(v: ReaderLineHeight): void {
    readerLineHeight.value = v
    persist()
  }

  function setReaderPaper(v: ReaderPaper): void {
    readerPaper.value = v
    persist()
  }

  const readerFontClass = computed(
    () =>
      ({
        s: 'text-[0.95rem]',
        m: 'text-[1.06rem]',
        l: 'text-[1.22rem]',
      })[readerFontScale.value]
  )

  const readerLeadingClass = computed(
    () =>
      ({
        compact: '!leading-snug',
        normal: '!leading-[1.85]',
        relaxed: '!leading-[2.15]',
      })[readerLineHeight.value]
  )

  const readerPaperClass = computed(
    () =>
      ({
        white: 'bg-transparent',
        sepia: 'bg-[#f4ecd8]/90 text-[#2c2416]',
        muted: 'bg-surface-sunken/80',
      })[readerPaper.value]
  )

  const presenterVerseFontSize = computed(
    () =>
      ({
        comfortable: 'clamp(1.5rem, 4vw, 3.5rem)',
        large: 'clamp(1.85rem, 4.8vw, 4.25rem)',
        auditorium: 'clamp(2.25rem, 5.5vw, 5rem)',
      })[presenterFontScale.value]
  )

  const presenterRefFontSize = computed(
    () =>
      ({
        comfortable: 'clamp(0.95rem, 1.6vw, 1.35rem)',
        large: 'clamp(1.05rem, 1.8vw, 1.5rem)',
        auditorium: 'clamp(1.15rem, 2vw, 1.65rem)',
      })[presenterFontScale.value]
  )

  const presenterRootClass = computed(
    () =>
      ({
        black: 'bg-black',
        navy: 'bg-slate-950',
        gradient: 'bg-gradient-to-b from-slate-950 via-black to-black',
        warm: '',
        forest: '',
        custom: '',
      })[presenterBackground.value]
  )

  const presenterBackgroundCss = computed(
    () =>
      ({
        black: '#000000',
        navy: '#020617',
        gradient: 'linear-gradient(180deg, #020617 0%, #0f172a 48%, #000000 100%)',
        warm: 'linear-gradient(135deg, #5b2333 0%, #b45309 58%, #f59e0b 100%)',
        forest: 'linear-gradient(135deg, #052e2b 0%, #14532d 55%, #111827 100%)',
        custom: presenterCustomBackground.value,
      })[presenterBackground.value]
  )

  const presenterRootStyle = computed<CSSProperties>(() => ({
    background: presenterBackgroundCss.value,
  }))

  // Pixel-based font sizes for the 1920×1080 scale-transform canvas preview.
  // Not viewport-relative so text renders crisply at any container size.
  const presenterCanvasFontPx = computed(
    () => ({ comfortable: 64, large: 80, auditorium: 96 })[presenterFontScale.value]
  )
  const presenterCanvasRefPx = computed(
    () => ({ comfortable: 28, large: 34, auditorium: 40 })[presenterFontScale.value]
  )
  const presenterCanvasLabelPx = 24 // section label / song footer — fixed

  return {
    defaultTranslationId,
    installedTranslationIds,
    parallelTranslationId,
    presenterUseSeparateTranslation,
    presenterTranslationId,
    presenterFontScale,
    presenterShowVerseRef,
    presenterBackground,
    presenterCustomBackground,
    songsShowCopyright,
    songsIntegration,
    readerFontScale,
    readerLineHeight,
    readerPaper,
    readerFontClass,
    readerLeadingClass,
    readerPaperClass,
    installedSelectOptions,
    translationApiCode,
    effectivePresenterTranslationId,
    setDefaultTranslation,
    installTranslation,
    removeTranslation,
    setParallelTranslation,
    setPresenterUseSeparate,
    setPresenterTranslation,
    setPresenterFontScale,
    setPresenterShowVerseRef,
    setPresenterBackground,
    setPresenterCustomBackground,
    setSongsShowCopyright,
    setSongsIntegration,
    setReaderFontScale,
    setReaderLineHeight,
    setReaderPaper,
    presenterVerseFontSize,
    presenterRefFontSize,
    presenterRootClass,
    presenterRootStyle,
    presenterBackgroundCss,
    presenterCanvasFontPx,
    presenterCanvasRefPx,
    presenterCanvasLabelPx,
  }
})
