import { http } from './http/client'
import type { CreateNotePayload, UpdateNotePayload, VerseNote } from '@/types/notes.types'

export const notesService = {
  async getMyNotes(): Promise<VerseNote[]> {
    const res = await http.get<VerseNote[]>('/api/notes')
    return res.data
  },

  async getVerseNotes(verseRef: string, sharedOnly = false): Promise<VerseNote[]> {
    const res = await http.get<VerseNote[]>(`/api/notes/verse/${encodeURIComponent(verseRef)}`, {
      params: { sharedOnly },
    })
    return res.data
  },

  async create(payload: CreateNotePayload): Promise<VerseNote> {
    const res = await http.post<VerseNote>('/api/notes', payload)
    return res.data
  },

  async update(id: string, payload: UpdateNotePayload): Promise<VerseNote> {
    const res = await http.put<VerseNote>(`/api/notes/${id}`, payload)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await http.delete(`/api/notes/${id}`)
  },
}
