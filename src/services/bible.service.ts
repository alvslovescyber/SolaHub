import { invoke } from '@tauri-apps/api/core'
import type { BookInfo, BibleChapter, VerseResult } from '@/types/bible.types'

/**
 * Bible service routes all reads through Tauri commands which query the local
 * SQLite cache. This means Bible data is available fully offline.
 */
export const bibleService = {
  async getBooks(): Promise<BookInfo[]> {
    return invoke<BookInfo[]>('get_book_list')
  },

  async getChapter(book: string, chapter: number): Promise<BibleChapter> {
    const verses = await invoke<VerseResult[]>('get_chapter', { book, chapter })
    return { book, chapter, verses }
  },

  async getVerse(book: string, chapter: number, verse: number): Promise<VerseResult> {
    return invoke<VerseResult>('get_verse', { book, chapter, verse })
  },

  async search(query: string, limit = 50): Promise<VerseResult[]> {
    return invoke<VerseResult[]>('search_verses', { query, limit })
  },
}
