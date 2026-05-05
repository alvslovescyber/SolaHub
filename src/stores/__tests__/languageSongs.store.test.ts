import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLanguageSongsStore } from '../languageSongs.store'
import type { LanguageSongMeta, SupportedLanguage } from '../languageSongs.store'

vi.mock('@/services/languageSongs.service', () => ({
  fetchLanguageIndex: vi.fn(),
  fetchSongSections: vi.fn(),
}))

import { fetchLanguageIndex, fetchSongSections } from '@/services/languageSongs.service'

const mockFetchIndex = vi.mocked(fetchLanguageIndex)
const mockFetchSections = vi.mocked(fetchSongSections)

function makeMeta(language: SupportedLanguage, n: number): LanguageSongMeta {
  return {
    id: `lang-${language.toLowerCase()}-${n}`,
    title: `Song ${n}`,
    nativeTitle: '',
    language,
    filePath: `txt/${n} Song VV ${language} 2021 ${n}.txt`,
  }
}

beforeEach(() => {
  localStorage.clear()
  mockFetchIndex.mockReset()
  mockFetchSections.mockReset()
})

describe('languageSongs store', () => {
  describe('initial state', () => {
    it('starts with all packs idle', () => {
      const store = useLanguageSongsStore()
      expect(store.packs.Malayalam.status).toBe('idle')
      expect(store.packs.Tamil.status).toBe('idle')
      expect(store.packs.Hindi.status).toBe('idle')
    })

    it('allLanguageSongs is empty when no packs are downloaded', () => {
      const store = useLanguageSongsStore()
      expect(store.allLanguageSongs).toHaveLength(0)
    })
  })

  describe('downloadPack', () => {
    it('sets status to ready and stores songs on success', async () => {
      const songs = [makeMeta('Malayalam', 1), makeMeta('Malayalam', 2)]
      mockFetchIndex.mockResolvedValueOnce(songs)

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      expect(store.packs.Malayalam.status).toBe('ready')
      expect(store.packs.Malayalam.songs).toHaveLength(2)
      expect(store.enabled.has('Malayalam')).toBe(true)
    })

    it('sets status to error when fetch fails', async () => {
      mockFetchIndex.mockRejectedValueOnce(new Error('Network error'))

      const store = useLanguageSongsStore()
      await store.downloadPack('Tamil')

      expect(store.packs.Tamil.status).toBe('error')
      expect(store.packs.Tamil.error).toBe('Network error')
    })

    it('persists enabled state to localStorage', async () => {
      mockFetchIndex.mockResolvedValueOnce([makeMeta('Hindi', 1)])

      const store = useLanguageSongsStore()
      await store.downloadPack('Hindi')

      const raw = localStorage.getItem('solahub:lang-packs:enabled')
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw!)).toContain('Hindi')
    })

    it('does not affect other packs', async () => {
      mockFetchIndex.mockResolvedValueOnce([makeMeta('Malayalam', 1)])

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      expect(store.packs.Tamil.status).toBe('idle')
      expect(store.packs.Hindi.status).toBe('idle')
    })
  })

  describe('removePack', () => {
    it('sets pack back to idle and clears songs', async () => {
      mockFetchIndex.mockResolvedValueOnce([makeMeta('Malayalam', 1)])
      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      store.removePack('Malayalam')

      expect(store.packs.Malayalam.status).toBe('idle')
      expect(store.packs.Malayalam.songs).toHaveLength(0)
      expect(store.enabled.has('Malayalam')).toBe(false)
    })

    it('removes pack meta from localStorage', async () => {
      mockFetchIndex.mockResolvedValueOnce([makeMeta('Tamil', 1)])
      const store = useLanguageSongsStore()
      await store.downloadPack('Tamil')

      store.removePack('Tamil')

      expect(localStorage.getItem('solahub:lang-packs:tamil:meta')).toBeNull()
    })
  })

  describe('getSongSections', () => {
    it('fetches sections on cache miss', async () => {
      const sections = [{ type: 'verse' as const, label: 'Verse 1', text: 'Words' }]
      mockFetchSections.mockResolvedValueOnce(sections)

      const store = useLanguageSongsStore()
      const meta = makeMeta('Malayalam', 1)
      const result = await store.getSongSections(meta)

      expect(mockFetchSections).toHaveBeenCalledOnce()
      expect(result).toEqual(sections)
    })

    it('returns cached sections without re-fetching', async () => {
      const sections = [{ type: 'chorus' as const, label: 'Chorus', text: 'Praise' }]
      mockFetchSections.mockResolvedValueOnce(sections)

      const store = useLanguageSongsStore()
      const meta = makeMeta('Malayalam', 1)

      await store.getSongSections(meta)
      await store.getSongSections(meta)

      expect(mockFetchSections).toHaveBeenCalledOnce()
    })
  })

  describe('allLanguageSongs computed', () => {
    it('includes songs from all ready packs', async () => {
      mockFetchIndex
        .mockResolvedValueOnce([makeMeta('Malayalam', 1), makeMeta('Malayalam', 2)])
        .mockResolvedValueOnce([makeMeta('Tamil', 1)])

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')
      await store.downloadPack('Tamil')

      expect(store.allLanguageSongs.length).toBeGreaterThanOrEqual(3)
    })

    it('excludes songs from removed packs', async () => {
      mockFetchIndex.mockResolvedValueOnce([makeMeta('Malayalam', 1)])
      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      store.removePack('Malayalam')

      const langSongs = store.allLanguageSongs.filter((s) => s.id.startsWith('lang-'))
      expect(langSongs).toHaveLength(0)
    })

    it('maps meta to Song shape with correct fields', async () => {
      const meta = makeMeta('Malayalam', 42)
      mockFetchIndex.mockResolvedValueOnce([meta])

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      const song = store.allLanguageSongs.find((s) => s.id === meta.id)
      expect(song).toBeDefined()
      expect(song?.title).toBe('Song 42')
      expect(song?.author).toBe('Malayalam Worship')
      expect(song?.isCustom).toBe(false)
    })
  })
})
