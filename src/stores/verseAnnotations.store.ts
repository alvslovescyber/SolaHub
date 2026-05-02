import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { VerseResult } from '@/types/bible.types'

const STORAGE_KEY = 'solahub:verse-annotations'

interface Persisted {
  highlights: Record<string, string>
  savedVerses: VerseResult[]
  notes: Record<string, string>
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { highlights: {}, savedVerses: [], notes: {} }
    return JSON.parse(raw) as Persisted
  } catch {
    return { highlights: {}, savedVerses: [], notes: {} }
  }
}

export const useVerseAnnotationsStore = defineStore('verseAnnotations', () => {
  const initial = load()

  const highlights = ref<Record<string, string>>(initial.highlights)
  const savedVerses = ref<VerseResult[]>(initial.savedVerses)
  const notes = ref<Record<string, string>>(initial.notes)

  function verseKey(book: string, chapter: number, verse: number): string {
    return `${book}.${chapter}.${verse}`
  }

  function setHighlight(key: string, colorId: string): void {
    if (!colorId) {
      delete highlights.value[key]
    } else {
      highlights.value[key] = colorId
    }
    persist()
  }

  function saveVerse(verse: VerseResult): void {
    const exists = savedVerses.value.some(
      (v) => v.book === verse.book && v.chapter === verse.chapter && v.verse === verse.verse
    )
    if (!exists) {
      savedVerses.value = [...savedVerses.value, verse]
      persist()
    }
  }

  function removeSavedVerse(book: string, chapter: number, verse: number): void {
    savedVerses.value = savedVerses.value.filter(
      (v) => !(v.book === book && v.chapter === chapter && v.verse === verse)
    )
    persist()
  }

  function setNote(key: string, text: string): void {
    if (!text.trim()) {
      delete notes.value[key]
    } else {
      notes.value[key] = text
    }
    persist()
  }

  function persist(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        highlights: highlights.value,
        savedVerses: savedVerses.value,
        notes: notes.value,
      })
    )
  }

  return { highlights, savedVerses, notes, verseKey, setHighlight, saveVerse, removeSavedVerse, setNote }
})
