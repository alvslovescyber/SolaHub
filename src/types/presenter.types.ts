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

export type NotationTextAlign = 'left' | 'center' | 'right'
export type NotationTextWeight = 'regular' | 'medium' | 'bold'
export type SlideBackgroundType = 'preset' | 'solid' | 'gradient' | 'image' | 'motion'
export type SlideTextTone = 'light' | 'dark'

export interface SlideBackground {
  type: SlideBackgroundType
  value: string
  textTone: SlideTextTone
}

export interface NotationElementBase {
  id: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  color: string
  align: NotationTextAlign
  fontWeight: NotationTextWeight
}

export interface NotationTextElement extends NotationElementBase {
  kind: 'text'
  text: string
}

export interface NotationVerseElement extends NotationElementBase {
  kind: 'verse'
  reference: string
  text: string
  translation: string
  showReference: boolean
}

export type NotationElement = NotationTextElement | NotationVerseElement

export interface NotationSlide {
  source: 'notation'
  verseRef: string
  title: string
  text: string
  background: SlideBackground
  elements: NotationElement[]
}

export interface NotationDeck {
  id: string
  title: string
  slides: NotationSlide[]
  createdAt: string
  updatedAt: string
}

export type PresenterSlide = ScriptureSlide | SongSlide | NotationSlide

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

export function isNotationSlide(s: PresenterSlide): s is NotationSlide {
  return s.source === 'notation'
}
