import { beforeEach, describe, expect, it } from 'vitest'
import { useNotationsStore } from '../notations.store'

describe('notations store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('preserves image backgrounds for Notations presentation', () => {
    const store = useNotationsStore()
    const slide = store.currentSlide
    expect(slide).not.toBeNull()

    store.updateSlide(slide!.verseRef, {
      background: {
        type: 'image',
        value: 'data:image/png;base64,abc123',
        textTone: 'light',
      },
    })

    const [notationSlide] = store.slidesForNotationPresentation()
    expect(notationSlide.background).toMatchObject({
      type: 'image',
      value: 'data:image/png;base64,abc123',
    })
  })

  it('preserves imported image backgrounds when loaded into Presenter', () => {
    const store = useNotationsStore()
    const slide = store.currentSlide
    expect(slide).not.toBeNull()

    store.updateSlide(slide!.verseRef, {
      background: {
        type: 'image',
        value: 'data:image/png;base64,abc123',
        textTone: 'light',
      },
    })

    const [presenterSlide] = store.slidesForPresenter()
    expect(presenterSlide.background).toMatchObject({
      type: 'image',
      value: 'data:image/png;base64,abc123',
    })
  })

  it('keeps non-image Notations backgrounds when loaded into Presenter', () => {
    const store = useNotationsStore()
    const slide = store.currentSlide
    expect(slide).not.toBeNull()

    store.updateSlide(slide!.verseRef, {
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #111827, #0f766e)',
        textTone: 'light',
      },
    })

    const [presenterSlide] = store.slidesForPresenter()
    expect(presenterSlide.background).toMatchObject({
      type: 'gradient',
      value: 'linear-gradient(135deg, #111827, #0f766e)',
    })
  })

  it('preserves motion backgrounds when loaded into Presenter', () => {
    const store = useNotationsStore()
    const slide = store.currentSlide
    expect(slide).not.toBeNull()

    store.updateSlide(slide!.verseRef, {
      background: {
        type: 'motion',
        value: 'linear-gradient(135deg, #020617, #14b8a6, #f59e0b)',
        textTone: 'light',
      },
    })

    const [presenterSlide] = store.slidesForPresenter()
    expect(presenterSlide.background).toMatchObject({
      type: 'motion',
      value: 'linear-gradient(135deg, #020617, #14b8a6, #f59e0b)',
    })
  })

  it('moves slides to requested deck positions', () => {
    const store = useNotationsStore()
    const first = store.currentSlide!
    const second = store.addSlide()
    const third = store.addSlide()

    store.moveSlide(third.verseRef, 0)
    expect(store.currentDeck?.slides.map((slide) => slide.verseRef)).toEqual([
      third.verseRef,
      first.verseRef,
      second.verseRef,
    ])

    store.moveSlide(third.verseRef, 2)
    expect(store.currentDeck?.slides.map((slide) => slide.verseRef)).toEqual([
      first.verseRef,
      second.verseRef,
      third.verseRef,
    ])
  })
})
