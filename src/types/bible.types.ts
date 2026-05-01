export interface BookInfo {
  shortName: string
  longName: string
  chapters: number
  testament: 'OT' | 'NT'
}

export interface VerseResult {
  book: string
  chapter: number
  verse: number
  text: string
}

export interface BibleChapter {
  book: string
  chapter: number
  verses: VerseResult[]
}

export interface SearchResults {
  query: string
  results: VerseResult[]
  total: number
}

/** Canonical Bible verse reference in BOOK.CHAPTER.VERSE format, e.g. "JHN.3.16" */
export type VerseRef = string
