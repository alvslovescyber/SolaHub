export interface VerseNote {
  id: string
  userId: string
  verseRef: string
  content: string
  tags: string[]
  isShared: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateNotePayload {
  verseRef: string
  content: string
  tags: string[]
  isShared: boolean
}

export interface UpdateNotePayload {
  content: string
  tags: string[]
  isShared: boolean
}
