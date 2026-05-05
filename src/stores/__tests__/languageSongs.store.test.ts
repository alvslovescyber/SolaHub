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

    it('exposes nativeTitle when meta has one', async () => {
      const meta: LanguageSongMeta = {
        id: 'lang-malayalam-7',
        title: 'Praise Him',
        nativeTitle: 'അവനെ സ്തുതിക്കുക',
        language: 'Malayalam',
        filePath: 'txt/7 Praise Him അവനെ സ്തുതിക്കുക VV Malayalam 2021 7.txt',
      }
      mockFetchIndex.mockResolvedValueOnce([meta])

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      const song = store.allLanguageSongs.find((s) => s.id === meta.id)
      expect(song?.nativeTitle).toBe('അവനെ സ്തുതിക്കുക')
    })

    it('sets nativeTitle to undefined when meta nativeTitle is empty', async () => {
      const meta: LanguageSongMeta = { ...makeMeta('Tamil', 3), nativeTitle: '' }
      mockFetchIndex.mockResolvedValueOnce([meta])

      const store = useLanguageSongsStore()
      await store.downloadPack('Tamil')

      const song = store.allLanguageSongs.find((s) => s.id === meta.id)
      expect(song?.nativeTitle).toBeUndefined()
    })

    it('starts with empty sections before any content is fetched', async () => {
      mockFetchIndex.mockResolvedValueOnce([makeMeta('Malayalam', 1)])

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      const song = store.allLanguageSongs[0]
      expect(song?.sections).toHaveLength(0)
    })

    it('reflects cached sections after loadSongById is called', async () => {
      const meta = makeMeta('Malayalam', 1)
      mockFetchIndex.mockResolvedValueOnce([meta])
      const sections = [{ type: 'verse' as const, label: 'Verse 1', text: 'Glory' }]
      mockFetchSections.mockResolvedValueOnce(sections)

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')
      await store.loadSongById(meta.id)

      const song = store.allLanguageSongs.find((s) => s.id === meta.id)
      expect(song?.sections).toHaveLength(1)
      expect(song?.sections[0].text).toBe('Glory')
    })
  })

  describe('loadSongById', () => {
    it('fetches and returns sections for a known song id', async () => {
      const meta = makeMeta('Malayalam', 5)
      mockFetchIndex.mockResolvedValueOnce([meta])
      const sections = [
        { type: 'chorus' as const, label: 'Chorus', text: 'Hallelujah' },
        { type: 'verse' as const, label: 'Verse 1', text: 'First verse' },
      ]
      mockFetchSections.mockResolvedValueOnce(sections)

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      const result = await store.loadSongById(meta.id)
      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('Hallelujah')
    })

    it('returns empty array for an unknown id', async () => {
      const store = useLanguageSongsStore()
      const result = await store.loadSongById('lang-malayalam-9999')
      expect(result).toHaveLength(0)
      expect(mockFetchSections).not.toHaveBeenCalled()
    })

    it('finds a song across different language packs', async () => {
      const tamilMeta = makeMeta('Tamil', 10)
      mockFetchIndex.mockResolvedValueOnce([makeMeta('Malayalam', 1)])
      mockFetchIndex.mockResolvedValueOnce([tamilMeta])
      const sections = [{ type: 'verse' as const, label: 'Verse 1', text: 'Tamil lyric' }]
      mockFetchSections.mockResolvedValueOnce(sections)

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')
      await store.downloadPack('Tamil')

      const result = await store.loadSongById(tamilMeta.id)
      expect(result[0].text).toBe('Tamil lyric')
    })

    it('does not re-fetch on a second call for the same song', async () => {
      const meta = makeMeta('Malayalam', 2)
      mockFetchIndex.mockResolvedValueOnce([meta])
      const sections = [{ type: 'verse' as const, label: 'Verse 1', text: 'Cached' }]
      mockFetchSections.mockResolvedValueOnce(sections)

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      await store.loadSongById(meta.id)
      await store.loadSongById(meta.id)

      expect(mockFetchSections).toHaveBeenCalledOnce()
    })
  })

  describe('song search filtering', () => {
    it('matches by English title', async () => {
      const meta: LanguageSongMeta = {
        id: 'lang-malayalam-1',
        title: 'Worthy Is the Lamb',
        nativeTitle: 'കുഞ്ഞാടു യോഗ്യൻ',
        language: 'Malayalam',
        filePath: 'txt/1 Song VV Malayalam 2021 1.txt',
      }
      mockFetchIndex.mockResolvedValueOnce([meta])

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      const q = 'worthy'
      const match = store.allLanguageSongs.filter(
        (s) => s.title.toLowerCase().includes(q) || (s.nativeTitle?.toLowerCase().includes(q) ?? false)
      )
      expect(match).toHaveLength(1)
    })

    it('matches by native script', async () => {
      const meta: LanguageSongMeta = {
        id: 'lang-malayalam-1',
        title: 'Worthy Is the Lamb',
        nativeTitle: 'കുഞ്ഞാടു യോഗ്യൻ',
        language: 'Malayalam',
        filePath: 'txt/1 Song VV Malayalam 2021 1.txt',
      }
      mockFetchIndex.mockResolvedValueOnce([meta])

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      const q = 'കുഞ്ഞ'
      const match = store.allLanguageSongs.filter(
        (s) => s.title.toLowerCase().includes(q) || (s.nativeTitle?.toLowerCase().includes(q) ?? false)
      )
      expect(match).toHaveLength(1)
    })

    it('returns no results for a query matching neither title nor native title', async () => {
      const meta: LanguageSongMeta = {
        id: 'lang-malayalam-1',
        title: 'Worthy Is the Lamb',
        nativeTitle: 'കുഞ്ഞാടു യോഗ്യൻ',
        language: 'Malayalam',
        filePath: 'txt/1 Song VV Malayalam 2021 1.txt',
      }
      mockFetchIndex.mockResolvedValueOnce([meta])

      const store = useLanguageSongsStore()
      await store.downloadPack('Malayalam')

      const q = 'zzznomatch'
      const match = store.allLanguageSongs.filter(
        (s) => s.title.toLowerCase().includes(q) || (s.nativeTitle?.toLowerCase().includes(q) ?? false)
      )
      expect(match).toHaveLength(0)
    })
  })
})
