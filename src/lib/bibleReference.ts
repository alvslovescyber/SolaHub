import type { BookInfo } from '@/types/bible.types'

/** Normalise book tokens like "Psalms", "1 Timothy", "song-of-solomon" → comparable key */
function normBookKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

/**
 * Common aliases → short codes (must match `BookInfo.shortName` in the canon list).
 */
const BOOK_ALIASES: Record<string, string> = {
  psalm: 'PSA',
  psalms: 'PSA',
  ps: 'PSA',
  songofsolomon: 'SNG',
  songofsongs: 'SNG',
  canticles: 'SNG',
}

export function resolveBookShortCode(rawBook: string, books: BookInfo[]): string | null {
  const trimmed = rawBook.trim()
  if (!trimmed) return null

  const upper = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (upper.length <= 4 && books.some((b) => b.shortName === upper)) {
    return upper
  }

  const key = normBookKey(trimmed)
  const alias = BOOK_ALIASES[key]
  if (alias && books.some((b) => b.shortName === alias)) return alias

  for (const b of books) {
    const ln = normBookKey(b.longName)
    if (ln === key || ln.startsWith(key) || key.startsWith(ln)) return b.shortName
    const sn = normBookKey(b.shortName)
    if (sn === key) return b.shortName
  }

  return null
}

export interface ParsedVerseRef {
  book: string
  chapter: number
  verse?: number
}

/**
 * Parse queries such as `Psalms 21:7`, `psalm 21:21`, `John 3:16`, `1 Tim 1:1`,
 * `GEN 1:1`, `Matthew 5`.
 */
export function parseVerseReference(query: string, books: BookInfo[]): ParsedVerseRef | null {
  const q = query.trim()
  if (!q || books.length === 0) return null

  // BOOK CHAPTER:VERSE
  const withColon = /^(.+?)\s+(\d{1,3})\s*:\s*(\d{1,3})\s*$/i.exec(q)
  if (withColon) {
    const book = resolveBookShortCode(withColon[1], books)
    const chapter = Number(withColon[2])
    const verse = Number(withColon[3])
    if (!book || !Number.isFinite(chapter) || !Number.isFinite(verse)) return null
    const meta = books.find((b) => b.shortName === book)
    if (meta && chapter > meta.chapters) return null
    return { book, chapter, verse }
  }

  // BOOK CHAPTER (whole chapter)
  const chapterOnly = /^(.+?)\s+(\d{1,3})\s*$/i.exec(q)
  if (chapterOnly && !q.includes(':')) {
    const book = resolveBookShortCode(chapterOnly[1], books)
    const chapter = Number(chapterOnly[2])
    if (!book || !Number.isFinite(chapter)) return null
    const meta = books.find((b) => b.shortName === book)
    if (meta && chapter > meta.chapters) return null
    return { book, chapter }
  }

  return null
}
