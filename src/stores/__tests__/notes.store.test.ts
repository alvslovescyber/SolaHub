import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useNotesStore } from '../notes.store'
import type { VerseNote } from '@/types/notes.types'

vi.mock('@/services/notes.service', () => ({
  notesService: {
    getMyNotes: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const { notesService } = await import('@/services/notes.service')

const makeNote = (overrides: Partial<VerseNote> = {}): VerseNote => ({
  id: 'note-1',
  userId: 'user-1',
  verseRef: 'John 3:16',
  content: 'For God so loved the world',
  tags: [],
  isShared: false,
  createdAt: '2025-05-01T10:00:00Z',
  updatedAt: '2025-05-01T10:00:00Z',
  ...overrides,
})

describe('notes store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchMyNotes', () => {
    it('loads notes from the service on first call', async () => {
      const mockNotes = [makeNote()]
      vi.mocked(notesService.getMyNotes).mockResolvedValue(mockNotes)

      const store = useNotesStore()
      await store.fetchMyNotes()

      expect(notesService.getMyNotes).toHaveBeenCalledOnce()
      expect(store.notes).toEqual(mockNotes)
    })

    it('skips the network call when cache is still fresh', async () => {
      const mockNotes = [makeNote()]
      vi.mocked(notesService.getMyNotes).mockResolvedValue(mockNotes)

      const store = useNotesStore()
      await store.fetchMyNotes() // populates cache
      await store.fetchMyNotes() // should be skipped

      expect(notesService.getMyNotes).toHaveBeenCalledOnce()
    })

    it('re-fetches when force=true ignores the cache', async () => {
      const mockNotes = [makeNote()]
      vi.mocked(notesService.getMyNotes).mockResolvedValue(mockNotes)

      const store = useNotesStore()
      await store.fetchMyNotes()
      await store.fetchMyNotes(true) // forced refresh

      expect(notesService.getMyNotes).toHaveBeenCalledTimes(2)
    })

    it('re-fetches after invalidateCache() is called', async () => {
      const mockNotes = [makeNote()]
      vi.mocked(notesService.getMyNotes).mockResolvedValue(mockNotes)

      const store = useNotesStore()
      await store.fetchMyNotes()
      store.invalidateCache()
      await store.fetchMyNotes()

      expect(notesService.getMyNotes).toHaveBeenCalledTimes(2)
    })

    it('sets error state on failure', async () => {
      vi.mocked(notesService.getMyNotes).mockRejectedValue(new Error('Network error'))

      const store = useNotesStore()
      await store.fetchMyNotes()

      expect(store.error).toBe('Failed to load notes.')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('create', () => {
    it('prepends the new note to the list', async () => {
      const existing = makeNote({ id: 'note-old' })
      const created = makeNote({ id: 'note-new', verseRef: 'Psalm 23:1' })

      vi.mocked(notesService.getMyNotes).mockResolvedValue([existing])
      vi.mocked(notesService.create).mockResolvedValue(created)

      const store = useNotesStore()
      await store.fetchMyNotes()
      await store.create({
        verseRef: 'Psalm 23:1',
        content: 'The Lord is my shepherd',
        tags: [],
        isShared: false,
      })

      expect(store.notes[0].id).toBe('note-new')
      expect(store.notes[1].id).toBe('note-old')
    })

    it('sets activeNoteId to the new note', async () => {
      const created = makeNote({ id: 'note-new' })
      vi.mocked(notesService.getMyNotes).mockResolvedValue([])
      vi.mocked(notesService.create).mockResolvedValue(created)

      const store = useNotesStore()
      await store.fetchMyNotes()
      await store.create({
        verseRef: 'John 1:1',
        content: 'In the beginning',
        tags: [],
        isShared: false,
      })

      expect(store.activeNoteId).toBe('note-new')
    })
  })

  describe('update', () => {
    it('replaces the updated note in the list', async () => {
      const original = makeNote({ content: 'original' })
      const updated = makeNote({ content: 'revised' })

      vi.mocked(notesService.getMyNotes).mockResolvedValue([original])
      vi.mocked(notesService.update).mockResolvedValue(updated)

      const store = useNotesStore()
      await store.fetchMyNotes()
      await store.update('note-1', { content: 'revised' })

      expect(store.notes[0].content).toBe('revised')
    })
  })

  describe('remove', () => {
    it('removes the note from the list', async () => {
      const note = makeNote()
      vi.mocked(notesService.getMyNotes).mockResolvedValue([note])
      vi.mocked(notesService.delete).mockResolvedValue(undefined)

      const store = useNotesStore()
      await store.fetchMyNotes()
      await store.remove('note-1')

      expect(store.notes).toHaveLength(0)
    })

    it('clears activeNoteId when removing the active note', async () => {
      const note = makeNote()
      vi.mocked(notesService.getMyNotes).mockResolvedValue([note])
      vi.mocked(notesService.delete).mockResolvedValue(undefined)

      const store = useNotesStore()
      await store.fetchMyNotes()
      store.setActiveNote('note-1')
      await store.remove('note-1')

      expect(store.activeNoteId).toBeNull()
    })
  })

  describe('computed', () => {
    it('notesByVerseRef groups notes by verse', async () => {
      const notes = [
        makeNote({ id: 'a', verseRef: 'John 3:16' }),
        makeNote({ id: 'b', verseRef: 'John 3:16' }),
        makeNote({ id: 'c', verseRef: 'Psalm 23:1' }),
      ]
      vi.mocked(notesService.getMyNotes).mockResolvedValue(notes)

      const store = useNotesStore()
      await store.fetchMyNotes()

      expect(store.notesByVerseRef.get('John 3:16')).toHaveLength(2)
      expect(store.notesByVerseRef.get('Psalm 23:1')).toHaveLength(1)
    })
  })
})
