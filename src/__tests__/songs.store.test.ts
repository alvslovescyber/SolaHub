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

    it('built-in songs have static ids', () => {
      const store = useSongsStore()
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

  describe('updateSong', () => {
    it('updates and persists custom songs', () => {
      const store = useSongsStore()
      store.addSong({ title: 'Draft Song', sections: [{ type: 'verse', label: 'V', text: 'x' }] })
      const song = store.allSongs.find((s) => s.title === 'Draft Song')!

      store.updateSong(song.id, {
        title: 'Edited Song',
        author: 'Editor',
        sections: [{ type: 'chorus', label: 'Chorus', text: 'edited lyric' }],
      })

      expect(store.allSongs.some((s) => s.title === 'Draft Song')).toBe(false)
      expect(store.allSongs.find((s) => s.id === song.id)?.title).toBe('Edited Song')

      const parsed = JSON.parse(localStorage.getItem('solahub:custom-songs')!)
      expect(parsed.find((s: { id: string }) => s.id === song.id)?.title).toBe('Edited Song')
    })

    it('updates and persists built-in song edits without converting them to custom songs', () => {
      const store = useSongsStore()
      const builtIn = store.allSongs.find((s) => s.id === 'amazing-grace')!

      store.updateSong(builtIn.id, {
        title: 'Amazing Grace Edited',
        author: builtIn.author,
        year: builtIn.year,
        sections: [{ type: 'verse', label: 'Verse 1', text: 'Edited lyrics' }],
      })

      const edited = store.allSongs.find((s) => s.id === builtIn.id)!
      expect(edited.title).toBe('Amazing Grace Edited')
      expect(edited.id).toBe('amazing-grace')
      expect(edited.isCustom).toBeUndefined()

      const parsed = JSON.parse(localStorage.getItem('solahub:song-edits')!)
      expect(parsed['amazing-grace'].title).toBe('Amazing Grace Edited')
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

    it('ignores invalid custom song payloads from localStorage', () => {
      localStorage.setItem(
        'solahub:custom-songs',
        JSON.stringify([
          { id: 'custom-valid', title: ' Valid ', sections: [{ label: 'V1', text: ' lyric ' }] },
          { id: 'custom-empty-title', title: '', sections: [{ label: 'V1', text: 'lyric' }] },
          { id: 'not-custom', title: 'Wrong id', sections: [{ label: 'V1', text: 'lyric' }] },
          { id: 'custom-empty-sections', title: 'No lyrics', sections: [] },
        ])
      )

      const store = useSongsStore()
      expect(store.allSongs.some((s) => s.title === 'Valid')).toBe(true)
      expect(store.allSongs.some((s) => s.title === 'Wrong id')).toBe(false)
      expect(store.allSongs.some((s) => s.title === 'No lyrics')).toBe(false)
    })

    it('rehydrates built-in song edits from localStorage', () => {
      localStorage.setItem(
        'solahub:song-edits',
        JSON.stringify({
          'amazing-grace': {
            title: 'Saved Amazing Grace',
            author: 'Saved Author',
            sections: [{ type: 'verse', label: 'V1', text: 'saved lyric' }],
          },
        })
      )

      const store = useSongsStore()
      expect(store.allSongs.find((s) => s.id === 'amazing-grace')?.title).toBe(
        'Saved Amazing Grace'
      )
    })

    it('ignores invalid built-in edits instead of breaking allSongs', () => {
      localStorage.setItem(
        'solahub:song-edits',
        JSON.stringify({
          'amazing-grace': { title: '', sections: [{ text: 'lyric' }] },
          'holy-holy-holy': { title: 'Edited Holy', sections: 'not-an-array' },
          'unknown-song': { title: 'Unknown', sections: [{ text: 'lyric' }] },
        })
      )

      const store = useSongsStore()
      expect(store.allSongs.find((s) => s.id === 'amazing-grace')?.title).toBe('Amazing Grace')
      expect(store.allSongs.find((s) => s.id === 'holy-holy-holy')?.title).toBe('Holy, Holy, Holy')
      expect(store.allSongs.some((s) => s.title === 'Unknown')).toBe(false)
    })
  })
})
