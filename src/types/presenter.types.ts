export interface ScriptureSlide {
  source: 'scripture'
  verseRef: string
  text: string
  book: string
  chapter: number
  verse: number
}

export interface SongSlide {
  source: 'song'
  verseRef: string
  text: string
  songTitle: string
  sectionLabel: string
}

export type PresenterSlide = ScriptureSlide | SongSlide

export interface PresenterSession {
  planId: string | null
  slides: PresenterSlide[]
  currentIndex: number
  isFullscreen: boolean
  displayWindowOpen: boolean
  overlayOpen: boolean
}

export function isScriptureSlide(s: PresenterSlide): s is ScriptureSlide {
  return s.source === 'scripture'
}

export function isSongSlide(s: PresenterSlide): s is SongSlide {
  return s.source === 'song'
}
