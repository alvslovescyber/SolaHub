import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSongsStore } from '@/stores/songs.store'

// Isolate localStorage between tests
beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('songs.store', () => {
  describe('built-in songs', () => {
    it('ships with at least 5 built-in songs', () => {
      const store = useSongsStore()
      expect(store.allSongs.length).toBeGreaterThanOrEqual(5)
    })

    it('built-in songs have at least one section each', () => {
      const store = useSongsStore()
      for (const song of store.allSongs) {
        expect(song.sections.length).toBeGreaterThan(0)
      }
    })

    it('built-in songs are not editable (have no custom id prefix)', () => {
      const store = useSongsStore()
      // Built-in songs have static ids — they don't start with 'custom-'
      const builtIn = store.allSongs.filter((s) => !s.id.startsWith('custom-'))
      expect(builtIn.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('addSong', () => {
    it('adds a song and makes it available in allSongs', () => {
      const store = useSongsStore()
      const initial = store.allSongs.length
      store.addSong({
        title: 'Test Hymn',
        sections: [{ type: 'verse', label: 'Verse 1', text: 'Test lyric' }],
      })
      expect(store.allSongs.length).toBe(initial + 1)
      expect(store.allSongs.some((s) => s.title === 'Test Hymn')).toBe(true)
    })

    it('generates a unique id for each added song', () => {
      const store = useSongsStore()
      store.addSong({ title: 'Song A', sections: [{ type: 'verse', label: 'V1', text: 'a' }] })
      store.addSong({ title: 'Song B', sections: [{ type: 'verse', label: 'V1', text: 'b' }] })
      const custom = store.allSongs.filter((s) => s.id.startsWith('custom-'))
      const ids = custom.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length) // all unique
    })

    it('stores optional author field', () => {
      const store = useSongsStore()
      store.addSong({
        title: 'Written Song',
        author: 'Jane Doe',
        sections: [{ type: 'chorus', label: 'Chorus', text: 'lyrics' }],
      })
      const song = store.allSongs.find((s) => s.title === 'Written Song')
      expect(song?.author).toBe('Jane Doe')
    })

    it('persists custom songs to localStorage', () => {
      const store = useSongsStore()
      store.addSong({ title: 'Persisted', sections: [{ type: 'verse', label: 'V', text: 'x' }] })
      const raw = localStorage.getItem('solahub:custom-songs')
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw!)
      expect(parsed.some((s: { title: string }) => s.title === 'Persisted')).toBe(true)
    })
  })

  describe('removeSong', () => {
    it('removes a custom song by id', () => {
      const store = useSongsStore()
      store.addSong({ title: 'To Remove', sections: [{ type: 'verse', label: 'V', text: 'x' }] })
      const song = store.allSongs.find((s) => s.title === 'To Remove')!
      const initial = store.allSongs.length
      store.removeSong(song.id)
      expect(store.allSongs.length).toBe(initial - 1)
      expect(store.allSongs.some((s) => s.id === song.id)).toBe(false)
    })

    it('does not remove built-in songs', () => {
      const store = useSongsStore()
      const builtIn = store.allSongs.find((s) => !s.id.startsWith('custom-'))!
      const initial = store.allSongs.length
      store.removeSong(builtIn.id)
      // Built-in songs should be ignored by removeSong (custom-only)
      expect(store.allSongs.length).toBe(initial)
    })
  })

  describe('persistence', () => {
    it('rehydrates custom songs from localStorage on creation', () => {
      const customSongs = [
        {
          id: 'custom-rehydrated',
          title: 'Rehydrated Song',
          sections: [{ type: 'verse', label: 'V1', text: 'lyric' }],
        },
      ]
      localStorage.setItem('solahub:custom-songs', JSON.stringify(customSongs))

      const store = useSongsStore()
      expect(store.allSongs.some((s) => s.title === 'Rehydrated Song')).toBe(true)
    })

    it('ignores malformed localStorage data and returns built-ins', () => {
      localStorage.setItem('solahub:custom-songs', 'not-valid-json{{{')
      const store = useSongsStore()
      expect(store.allSongs.length).toBeGreaterThanOrEqual(5)
    })
  })
})
