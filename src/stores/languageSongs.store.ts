import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { writeJsonStorage, getStorageItem, removeStorageItem } from '@/lib/safeStorage'
import {
  fetchLanguageIndex,
  fetchSongSections,
  type SupportedLanguage,
  type LanguageSongMeta,
} from '@/services/languageSongs.service'
import type { Song, SongSection } from '@/stores/songs.store'

export type { SupportedLanguage, LanguageSongMeta }

export type PackStatus = 'idle' | 'downloading' | 'ready' | 'error'

export interface LanguagePack {
  status: PackStatus
  songs: LanguageSongMeta[]
  error: string | null
  downloadedAt: string | null
}

const ENABLED_KEY = 'solahub:lang-packs:enabled'
const META_KEY = (lang: SupportedLanguage) => `solahub:lang-packs:${lang.toLowerCase()}:meta`
const CONTENT_KEY = (lang: SupportedLanguage) => `solahub:lang-packs:${lang.toLowerCase()}:content`
const CONTENT_CACHE_LIMIT = 150

const LANGUAGES: SupportedLanguage[] = ['Malayalam', 'Tamil', 'Hindi']

function loadEnabled(): Set<SupportedLanguage> {
  try {
    const raw = getStorageItem(ENABLED_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(parsed) ? (parsed as SupportedLanguage[]) : [])
  } catch {
    return new Set()
  }
}

function loadMeta(lang: SupportedLanguage): LanguageSongMeta[] {
  try {
    const raw = getStorageItem(META_KEY(lang))
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? (parsed as LanguageSongMeta[]) : []
  } catch {
    return []
  }
}

function loadContent(lang: SupportedLanguage): Record<string, SongSection[]> {
  try {
    const raw = getStorageItem(CONTENT_KEY(lang))
    return raw ? (JSON.parse(raw) as Record<string, SongSection[]>) : {}
  } catch {
    return {}
  }
}

function makePack(enabled: Set<SupportedLanguage>, lang: SupportedLanguage): LanguagePack {
  return {
    status: enabled.has(lang) ? 'ready' : 'idle',
    songs: enabled.has(lang) ? loadMeta(lang) : [],
    error: null,
    downloadedAt: null,
  }
}

export const useLanguageSongsStore = defineStore('languageSongs', () => {
  const enabled = ref<Set<SupportedLanguage>>(loadEnabled())

  const packs = ref<Record<SupportedLanguage, LanguagePack>>({
    Malayalam: makePack(enabled.value, 'Malayalam'),
    Tamil: makePack(enabled.value, 'Tamil'),
    Hindi: makePack(enabled.value, 'Hindi'),
  })

  const contentCache = ref<Record<SupportedLanguage, Record<string, SongSection[]>>>({
    Malayalam: loadContent('Malayalam'),
    Tamil: loadContent('Tamil'),
    Hindi: loadContent('Hindi'),
  })

  async function downloadPack(language: SupportedLanguage): Promise<void> {
    const pack = packs.value[language]
    pack.status = 'downloading'
    pack.error = null

    try {
      const songs = await fetchLanguageIndex(language)
      pack.songs = songs
      pack.status = 'ready'
      pack.downloadedAt = new Date().toISOString()
      enabled.value = new Set([...enabled.value, language])
      writeJsonStorage(META_KEY(language), songs)
      writeJsonStorage(ENABLED_KEY, [...enabled.value])
    } catch (e) {
      pack.status = 'error'
      pack.error = e instanceof Error ? e.message : 'Download failed. Check your connection.'
    }
  }

  function removePack(language: SupportedLanguage): void {
    const pack = packs.value[language]
    pack.status = 'idle'
    pack.songs = []
    pack.error = null
    pack.downloadedAt = null
    enabled.value = new Set([...enabled.value].filter((l) => l !== language))
    writeJsonStorage(ENABLED_KEY, [...enabled.value])
    removeStorageItem(META_KEY(language))
    removeStorageItem(CONTENT_KEY(language))
    contentCache.value[language] = {}
  }

  async function getSongSections(meta: LanguageSongMeta): Promise<SongSection[]> {
    const cache = contentCache.value[meta.language]
    if (cache[meta.id]) return cache[meta.id]

    const sections = await fetchSongSections(meta.filePath)

    const keys = Object.keys(cache)
    if (keys.length >= CONTENT_CACHE_LIMIT) {
      delete cache[keys[0]]
    }
    cache[meta.id] = sections

    try {
      writeJsonStorage(CONTENT_KEY(meta.language), cache)
    } catch {
      // localStorage full — skip persist
    }

    return sections
  }

  const allLanguageSongs = computed<Song[]>(() =>
    LANGUAGES.filter((lang) => packs.value[lang].status === 'ready').flatMap((lang) =>
      packs.value[lang].songs.map(
        (meta): Song => ({
          id: meta.id,
          title: meta.title || meta.nativeTitle,
          nativeTitle: meta.nativeTitle || undefined,
          author: `${meta.language} Worship`,
          isCustom: false,
          sections: contentCache.value[meta.language][meta.id] ?? [],
        })
      )
    )
  )

  async function loadSongById(id: string): Promise<SongSection[]> {
    for (const lang of LANGUAGES) {
      const meta = packs.value[lang].songs.find((m) => m.id === id)
      if (meta) return getSongSections(meta)
    }
    return []
  }

  return {
    packs,
    enabled,
    downloadPack,
    removePack,
    getSongSections,
    loadSongById,
    allLanguageSongs,
  }
})
