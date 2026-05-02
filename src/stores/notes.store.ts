import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { notesService } from '@/services/notes.service'
import type { CreateNotePayload, UpdateNotePayload, VerseNote } from '@/types/notes.types'

const CACHE_TTL = 5 * 60_000 // 5 minutes

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<VerseNote[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const activeNoteId = ref<string | null>(null)
  let lastFetchedAt = 0

  const activeNote = computed(() => notes.value.find((n) => n.id === activeNoteId.value) ?? null)

  const notesByVerseRef = computed(() => {
    const map = new Map<string, VerseNote[]>()
    for (const note of notes.value) {
      const existing = map.get(note.verseRef) ?? []
      existing.push(note)
      map.set(note.verseRef, existing)
    }
    return map
  })

  async function fetchMyNotes(force = false): Promise<void> {
    if (!force && notes.value.length > 0 && Date.now() - lastFetchedAt < CACHE_TTL) return
    isLoading.value = true
    error.value = null
    try {
      notes.value = await notesService.getMyNotes()
      lastFetchedAt = Date.now()
    } catch {
      error.value = 'Failed to load notes.'
    } finally {
      isLoading.value = false
    }
  }

  function invalidateCache(): void {
    lastFetchedAt = 0
  }

  function reset(): void {
    notes.value = []
    activeNoteId.value = null
    error.value = null
    lastFetchedAt = 0
  }

  async function create(payload: CreateNotePayload): Promise<VerseNote> {
    isSaving.value = true
    error.value = null
    try {
      const note = await notesService.create(payload)
      notes.value = [note, ...notes.value]
      activeNoteId.value = note.id
      lastFetchedAt = Date.now()
      return note
    } catch (e) {
      error.value = 'Failed to create note.'
      throw e
    } finally {
      isSaving.value = false
    }
  }

  async function update(id: string, payload: UpdateNotePayload): Promise<void> {
    isSaving.value = true
    error.value = null
    try {
      const updated = await notesService.update(id, payload)
      notes.value = notes.value.map((n) => (n.id === id ? updated : n))
      invalidateCache()
    } catch (e) {
      error.value = 'Failed to update note.'
      throw e
    } finally {
      isSaving.value = false
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      await notesService.delete(id)
      notes.value = notes.value.filter((n) => n.id !== id)
      if (activeNoteId.value === id) activeNoteId.value = null
      invalidateCache()
    } catch (e) {
      error.value = 'Failed to delete note.'
      throw e
    }
  }

  function setActiveNote(id: string | null): void {
    activeNoteId.value = id
  }

  return {
    notes,
    isLoading,
    isSaving,
    error,
    activeNoteId,
    activeNote,
    notesByVerseRef,
    fetchMyNotes,
    create,
    update,
    remove,
    setActiveNote,
    invalidateCache,
    reset,
  }
})
