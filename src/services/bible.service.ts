import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '@/lib/platform'
import type { BookInfo, BibleChapter, VerseResult } from '@/types/bible.types'

const DEFAULT_TRANSLATION = 'KJV'

// ─── Web fallback via bible-api.com ───────────────────────────────────────────

// Short names (Rust/SQLite convention) → bible-api.com URL slug
const BOOK_SLUG: Record<string, string> = {
  GEN: 'genesis',
  EXO: 'exodus',
  LEV: 'leviticus',
  NUM: 'numbers',
  DEU: 'deuteronomy',
  JOS: 'joshua',
  JDG: 'judges',
  RUT: 'ruth',
  '1SA': '1+samuel',
  '2SA': '2+samuel',
  '1KI': '1+kings',
  '2KI': '2+kings',
  '1CH': '1+chronicles',
  '2CH': '2+chronicles',
  EZR: 'ezra',
  NEH: 'nehemiah',
  EST: 'esther',
  JOB: 'job',
  PSA: 'psalms',
  PRO: 'proverbs',
  ECC: 'ecclesiastes',
  SNG: 'song+of+solomon',
  ISA: 'isaiah',
  JER: 'jeremiah',
  LAM: 'lamentations',
  EZK: 'ezekiel',
  DAN: 'daniel',
  HOS: 'hosea',
  JOL: 'joel',
  AMO: 'amos',
  OBA: 'obadiah',
  JON: 'jonah',
  MIC: 'micah',
  NAH: 'nahum',
  HAB: 'habakkuk',
  ZEP: 'zephaniah',
  HAG: 'haggai',
  ZEC: 'zechariah',
  MAL: 'malachi',
  MAT: 'matthew',
  MRK: 'mark',
  LUK: 'luke',
  JHN: 'john',
  ACT: 'acts',
  ROM: 'romans',
  '1CO': '1+corinthians',
  '2CO': '2+corinthians',
  GAL: 'galatians',
  EPH: 'ephesians',
  PHP: 'philippians',
  COL: 'colossians',
  '1TH': '1+thessalonians',
  '2TH': '2+thessalonians',
  '1TI': '1+timothy',
  '2TI': '2+timothy',
  TIT: 'titus',
  PHM: 'philemon',
  HEB: 'hebrews',
  JAS: 'james',
  '1PE': '1+peter',
  '2PE': '2+peter',
  '1JN': '1+john',
  '2JN': '2+john',
  '3JN': '3+john',
  JUD: 'jude',
  REV: 'revelation',
}

export const CANONICAL_BOOKS: BookInfo[] = [
  { shortName: 'GEN', longName: 'Genesis', chapters: 50, testament: 'OT' },
  { shortName: 'EXO', longName: 'Exodus', chapters: 40, testament: 'OT' },
  { shortName: 'LEV', longName: 'Leviticus', chapters: 27, testament: 'OT' },
  { shortName: 'NUM', longName: 'Numbers', chapters: 36, testament: 'OT' },
  { shortName: 'DEU', longName: 'Deuteronomy', chapters: 34, testament: 'OT' },
  { shortName: 'JOS', longName: 'Joshua', chapters: 24, testament: 'OT' },
  { shortName: 'JDG', longName: 'Judges', chapters: 21, testament: 'OT' },
  { shortName: 'RUT', longName: 'Ruth', chapters: 4, testament: 'OT' },
  { shortName: '1SA', longName: '1 Samuel', chapters: 31, testament: 'OT' },
  { shortName: '2SA', longName: '2 Samuel', chapters: 24, testament: 'OT' },
  { shortName: '1KI', longName: '1 Kings', chapters: 22, testament: 'OT' },
  { shortName: '2KI', longName: '2 Kings', chapters: 25, testament: 'OT' },
  { shortName: '1CH', longName: '1 Chronicles', chapters: 29, testament: 'OT' },
  { shortName: '2CH', longName: '2 Chronicles', chapters: 36, testament: 'OT' },
  { shortName: 'EZR', longName: 'Ezra', chapters: 10, testament: 'OT' },
  { shortName: 'NEH', longName: 'Nehemiah', chapters: 13, testament: 'OT' },
  { shortName: 'EST', longName: 'Esther', chapters: 10, testament: 'OT' },
  { shortName: 'JOB', longName: 'Job', chapters: 42, testament: 'OT' },
  { shortName: 'PSA', longName: 'Psalms', chapters: 150, testament: 'OT' },
  { shortName: 'PRO', longName: 'Proverbs', chapters: 31, testament: 'OT' },
  { shortName: 'ECC', longName: 'Ecclesiastes', chapters: 12, testament: 'OT' },
  { shortName: 'SNG', longName: 'Song of Solomon', chapters: 8, testament: 'OT' },
  { shortName: 'ISA', longName: 'Isaiah', chapters: 66, testament: 'OT' },
  { shortName: 'JER', longName: 'Jeremiah', chapters: 52, testament: 'OT' },
  { shortName: 'LAM', longName: 'Lamentations', chapters: 5, testament: 'OT' },
  { shortName: 'EZK', longName: 'Ezekiel', chapters: 48, testament: 'OT' },
  { shortName: 'DAN', longName: 'Daniel', chapters: 12, testament: 'OT' },
  { shortName: 'HOS', longName: 'Hosea', chapters: 14, testament: 'OT' },
  { shortName: 'JOL', longName: 'Joel', chapters: 3, testament: 'OT' },
  { shortName: 'AMO', longName: 'Amos', chapters: 9, testament: 'OT' },
  { shortName: 'OBA', longName: 'Obadiah', chapters: 1, testament: 'OT' },
  { shortName: 'JON', longName: 'Jonah', chapters: 4, testament: 'OT' },
  { shortName: 'MIC', longName: 'Micah', chapters: 7, testament: 'OT' },
  { shortName: 'NAH', longName: 'Nahum', chapters: 3, testament: 'OT' },
  { shortName: 'HAB', longName: 'Habakkuk', chapters: 3, testament: 'OT' },
  { shortName: 'ZEP', longName: 'Zephaniah', chapters: 3, testament: 'OT' },
  { shortName: 'HAG', longName: 'Haggai', chapters: 2, testament: 'OT' },
  { shortName: 'ZEC', longName: 'Zechariah', chapters: 14, testament: 'OT' },
  { shortName: 'MAL', longName: 'Malachi', chapters: 4, testament: 'OT' },
  { shortName: 'MAT', longName: 'Matthew', chapters: 28, testament: 'NT' },
  { shortName: 'MRK', longName: 'Mark', chapters: 16, testament: 'NT' },
  { shortName: 'LUK', longName: 'Luke', chapters: 24, testament: 'NT' },
  { shortName: 'JHN', longName: 'John', chapters: 21, testament: 'NT' },
  { shortName: 'ACT', longName: 'Acts', chapters: 28, testament: 'NT' },
  { shortName: 'ROM', longName: 'Romans', chapters: 16, testament: 'NT' },
  { shortName: '1CO', longName: '1 Corinthians', chapters: 16, testament: 'NT' },
  { shortName: '2CO', longName: '2 Corinthians', chapters: 13, testament: 'NT' },
  { shortName: 'GAL', longName: 'Galatians', chapters: 6, testament: 'NT' },
  { shortName: 'EPH', longName: 'Ephesians', chapters: 6, testament: 'NT' },
  { shortName: 'PHP', longName: 'Philippians', chapters: 4, testament: 'NT' },
  { shortName: 'COL', longName: 'Colossians', chapters: 4, testament: 'NT' },
  { shortName: '1TH', longName: '1 Thessalonians', chapters: 5, testament: 'NT' },
  { shortName: '2TH', longName: '2 Thessalonians', chapters: 3, testament: 'NT' },
  { shortName: '1TI', longName: '1 Timothy', chapters: 6, testament: 'NT' },
  { shortName: '2TI', longName: '2 Timothy', chapters: 4, testament: 'NT' },
  { shortName: 'TIT', longName: 'Titus', chapters: 3, testament: 'NT' },
  { shortName: 'PHM', longName: 'Philemon', chapters: 1, testament: 'NT' },
  { shortName: 'HEB', longName: 'Hebrews', chapters: 13, testament: 'NT' },
  { shortName: 'JAS', longName: 'James', chapters: 5, testament: 'NT' },
  { shortName: '1PE', longName: '1 Peter', chapters: 5, testament: 'NT' },
  { shortName: '2PE', longName: '2 Peter', chapters: 3, testament: 'NT' },
  { shortName: '1JN', longName: '1 John', chapters: 5, testament: 'NT' },
  { shortName: '2JN', longName: '2 John', chapters: 1, testament: 'NT' },
  { shortName: '3JN', longName: '3 John', chapters: 1, testament: 'NT' },
  { shortName: 'JUD', longName: 'Jude', chapters: 1, testament: 'NT' },
  { shortName: 'REV', longName: 'Revelation', chapters: 22, testament: 'NT' },
]

const WEB_CHAPTER_CACHE_TTL_MS = 180_000
const WEB_CHAPTER_CACHE_MAX = 80

const webChapterCache = new Map<string, { fetchedAt: number; chapter: BibleChapter }>()

function webChapterCacheKey(book: string, chapter: number, translation: string): string {
  return `${book.toUpperCase()}|${chapter}|${translation.toUpperCase()}`
}

/** Clone so callers can't mutate cached verses by reference. */
function cloneChapter(ch: BibleChapter): BibleChapter {
  return {
    book: ch.book,
    chapter: ch.chapter,
    verses: ch.verses.map((v) => ({ ...v })),
  }
}

function readWebChapterCache(key: string): BibleChapter | null {
  const row = webChapterCache.get(key)
  if (!row) return null
  if (Date.now() - row.fetchedAt > WEB_CHAPTER_CACHE_TTL_MS) {
    webChapterCache.delete(key)
    return null
  }
  return cloneChapter(row.chapter)
}

function writeWebChapterCache(key: string, chapter: BibleChapter): void {
  while (webChapterCache.size >= WEB_CHAPTER_CACHE_MAX) {
    const oldest = webChapterCache.keys().next().value
    if (oldest === undefined) break
    webChapterCache.delete(oldest)
  }
  webChapterCache.set(key, { fetchedAt: Date.now(), chapter: cloneChapter(chapter) })
}

interface BibleApiVerse {
  book_id: string
  book_name: string
  chapter: number
  verse: number
  text: string
}

async function bibleApiFetch(
  slug: string,
  translation: string,
  signal?: AbortSignal
): Promise<BibleApiVerse[]> {
  const t = translation.toLowerCase()
  const url = `https://bible-api.com/${slug}?translation=${encodeURIComponent(t)}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`bible-api.com error ${res.status}`)
  const data = (await res.json()) as { verses: BibleApiVerse[] }
  return data.verses
}

function mapVerse(v: BibleApiVerse): VerseResult {
  return { book: v.book_name, chapter: v.chapter, verse: v.verse, text: v.text.trim() }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const bibleService = {
  async getBooks(): Promise<BookInfo[]> {
    if (isTauri) {
      return invoke<BookInfo[]>('get_book_list')
    }
    return CANONICAL_BOOKS
  },

  async getChapter(
    book: string,
    chapter: number,
    translation = DEFAULT_TRANSLATION,
    signal?: AbortSignal
  ): Promise<BibleChapter> {
    if (isTauri) {
      try {
        const verses = await invoke<VerseResult[]>('get_chapter', { book, chapter, translation })
        if (verses.length > 0) return { book, chapter, verses }
      } catch {
        // verses table not seeded — fall through to web API
      }
    }
    const slug = BOOK_SLUG[book.toUpperCase()]
    if (!slug) throw new Error(`Unknown book: ${book}`)
    const ck = webChapterCacheKey(book, chapter, translation)
    const cached = readWebChapterCache(ck)
    if (cached) return cached
    const verses = await bibleApiFetch(`${slug}+${chapter}`, translation, signal)
    const result = { book, chapter, verses: verses.map(mapVerse) }
    writeWebChapterCache(ck, result)
    return result
  },

  async getVerse(
    book: string,
    chapter: number,
    verse: number,
    translation = DEFAULT_TRANSLATION,
    signal?: AbortSignal
  ): Promise<VerseResult> {
    if (isTauri) {
      try {
        const result = await invoke<VerseResult | null>('get_verse', {
          book,
          chapter,
          verse,
          translation,
        })
        if (result) return result
      } catch {
        // verses table not seeded — fall through to web API
      }
    }
    const slug = BOOK_SLUG[book.toUpperCase()]
    if (!slug) throw new Error(`Unknown book: ${book}`)
    const verses = await bibleApiFetch(`${slug}+${chapter}:${verse}`, translation, signal)
    if (!verses.length) throw new Error(`Verse not found: ${book} ${chapter}:${verse}`)
    return mapVerse(verses[0])
  },

  async search(query: string, translation = DEFAULT_TRANSLATION): Promise<VerseResult[]> {
    if (isTauri) {
      try {
        const results = await invoke<VerseResult[]>('search_verses', { query, translation })
        if (results.length > 0) return results
      } catch {
        // verses table not seeded — return empty
      }
    }
    return []
  },
}
