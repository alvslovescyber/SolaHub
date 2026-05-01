import { invoke } from '@tauri-apps/api/core'
import type { BookInfo, BibleChapter, VerseResult } from '@/types/bible.types'

// Active translation — can be made user-configurable via settings store in future
const DEFAULT_TRANSLATION = 'KJV'

/**
 * Bible service routes all reads through Tauri commands which query the local
 * SQLite cache. This means Bible data is available fully offline.
 */
export const bibleService = {
  async getBooks(): Promise<BookInfo[]> {
    return invoke<BookInfo[]>('get_book_list')
  },

  async getChapter(
    book: string,
    chapter: number,
    translation = DEFAULT_TRANSLATION
  ): Promise<BibleChapter> {
    const verses = await invoke<VerseResult[]>('get_chapter', { book, chapter, translation })
    return { book, chapter, verses }
  },

  async getVerse(
    book: string,
    chapter: number,
    verse: number,
    translation = DEFAULT_TRANSLATION
  ): Promise<VerseResult> {
    return invoke<VerseResult>('get_verse', { book, chapter, verse, translation })
  },

  async search(query: string, translation = DEFAULT_TRANSLATION): Promise<VerseResult[]> {
    return invoke<VerseResult[]>('search_verses', { query, translation })
  },
}
