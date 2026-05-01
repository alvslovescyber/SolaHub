export interface PresenterSlide {
  verseRef: string
  text: string
  book: string
  chapter: number
  verse: number
}

export interface PresenterSession {
  planId: string | null
  slides: PresenterSlide[]
  currentIndex: number
  isFullscreen: boolean
  displayWindowOpen: boolean
}
