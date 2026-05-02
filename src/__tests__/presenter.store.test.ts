import { describe, it, expect, vi } from 'vitest'
import { usePresenterStore } from '@/stores/presenter.store'
import type { PresenterSlide, ScriptureSlide, SongSlide } from '@/types/presenter.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeScripture(verse: number): ScriptureSlide {
  return {
    source: 'scripture',
    verseRef: `John.3.${verse}`,
    text: `Verse ${verse} text`,
    book: 'John',
    chapter: 3,
    verse,
  }
}

function makeSong(i: number): SongSlide {
  return {
    source: 'song',
    verseRef: `song.hymn.${i}`,
    text: `Lyric line ${i}`,
    songTitle: 'Amazing Grace',
    sectionLabel: i === 0 ? 'Verse 1' : 'Chorus',
  }
}

function makeSlides(count: number): ScriptureSlide[] {
  return Array.from({ length: count }, (_, i) => makeScripture(i + 1))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('presenter.store', () => {
  describe('initial state', () => {
    it('starts with no slides', () => {
      const store = usePresenterStore()
      expect(store.session.slides).toHaveLength(0)
      expect(store.session.currentIndex).toBe(0)
      expect(store.session.overlayOpen).toBe(false)
      expect(store.isBlanked).toBe(false)
    })

    it('currentSlide is null with no slides', () => {
      const store = usePresenterStore()
      expect(store.currentSlide).toBeNull()
    })

    it('progress is 0 with no slides', () => {
      const store = usePresenterStore()
      expect(store.progress).toBe(0)
    })

    it('hasNext and hasPrev are both false with no slides', () => {
      const store = usePresenterStore()
      expect(store.hasNext).toBe(false)
      expect(store.hasPrev).toBe(false)
    })
  })

  describe('loadSlides', () => {
    it('stores slides and resets index to 0', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(5))
      expect(store.session.slides).toHaveLength(5)
      expect(store.session.currentIndex).toBe(0)
    })

    it('clears isBlanked when loading new slides', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(3))
      store.toggleBlank()
      expect(store.isBlanked).toBe(true)

      store.loadSlides(makeSlides(3))
      expect(store.isBlanked).toBe(false)
    })

    it('sets planId when provided', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(2), 'plan-123')
      expect(store.session.planId).toBe('plan-123')
    })

    it('persists overlayOpen state across loadSlides', () => {
      const store = usePresenterStore()
      store.session.overlayOpen = true
      store.loadSlides(makeSlides(2))
      expect(store.session.overlayOpen).toBe(true)
    })
  })

  describe('navigation', () => {
    it('next advances currentIndex', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(3))
      store.next()
      expect(store.session.currentIndex).toBe(1)
    })

    it('next does not advance past the last slide', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(2))
      store.next()
      store.next() // should be a no-op
      expect(store.session.currentIndex).toBe(1)
    })

    it('prev decrements currentIndex', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(3))
      store.next()
      store.next()
      store.prev()
      expect(store.session.currentIndex).toBe(1)
    })

    it('prev does not go below 0', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(3))
      store.prev() // no-op at index 0
      expect(store.session.currentIndex).toBe(0)
    })

    it('goTo jumps to any valid index', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(10))
      store.goTo(7)
      expect(store.session.currentIndex).toBe(7)
    })

    it('goTo ignores out-of-bounds indices', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(3))
      store.goTo(99)
      expect(store.session.currentIndex).toBe(0)
      store.goTo(-1)
      expect(store.session.currentIndex).toBe(0)
    })

    it('goTo clears isBlanked', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(5))
      store.toggleBlank()
      store.goTo(3)
      expect(store.isBlanked).toBe(false)
      expect(store.session.currentIndex).toBe(3)
    })

    it('prev clears isBlanked', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(3))
      store.next()
      store.toggleBlank()
      store.prev()
      expect(store.isBlanked).toBe(false)
    })
  })

  describe('blank screen', () => {
    it('toggleBlank flips isBlanked', () => {
      const store = usePresenterStore()
      expect(store.isBlanked).toBe(false)
      store.toggleBlank()
      expect(store.isBlanked).toBe(true)
      store.toggleBlank()
      expect(store.isBlanked).toBe(false)
    })

    it('next un-blanks instead of advancing when blanked', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(3))
      store.next() // index → 1
      store.toggleBlank()
      store.next() // should un-blank, not advance
      expect(store.isBlanked).toBe(false)
      expect(store.session.currentIndex).toBe(1)
    })
  })

  describe('computed properties', () => {
    it('currentSlide returns the slide at currentIndex', () => {
      const store = usePresenterStore()
      const slides = makeSlides(3)
      store.loadSlides(slides)
      store.next()
      const current = store.currentSlide as ScriptureSlide | null
      expect(current?.verse).toBe(2)
    })

    it('progress is 100% when on the last slide', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(3))
      store.goTo(2)
      expect(store.progress).toBe(100)
    })

    it('progress is proportional to position', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(4))
      store.goTo(1)
      expect(store.progress).toBeCloseTo(50)
    })

    it('hasNext is false on the last slide', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(2))
      store.goTo(1)
      expect(store.hasNext).toBe(false)
    })

    it('hasPrev is false on the first slide', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(2))
      expect(store.hasPrev).toBe(false)
    })

    it('hasPrev is true after advancing', () => {
      const store = usePresenterStore()
      store.loadSlides(makeSlides(3))
      store.next()
      expect(store.hasPrev).toBe(true)
    })
  })

  describe('overlay', () => {
    it('openDisplayWindow sets overlayOpen', async () => {
      const store = usePresenterStore()
      await store.openDisplayWindow()
      expect(store.session.overlayOpen).toBe(true)
      expect(store.isBlanked).toBe(false)
    })

    it('closeDisplayWindow clears overlayOpen', async () => {
      const store = usePresenterStore()
      await store.openDisplayWindow()
      store.closeDisplayWindow()
      expect(store.session.overlayOpen).toBe(false)
    })

    it('closeOverlay clears overlayOpen and isBlanked', () => {
      const store = usePresenterStore()
      store.session.overlayOpen = true
      store.toggleBlank()
      store.closeOverlay()
      expect(store.session.overlayOpen).toBe(false)
      expect(store.isBlanked).toBe(false)
    })
  })

  describe('song slides', () => {
    it('loads song slides with correct source', () => {
      const store = usePresenterStore()
      const slides: PresenterSlide[] = [makeSong(0), makeSong(1)]
      store.loadSlides(slides)
      expect(store.session.slides[0].source).toBe('song')
      const song = store.currentSlide as SongSlide | null
      expect(song?.sectionLabel).toBe('Verse 1')
    })
  })
})
