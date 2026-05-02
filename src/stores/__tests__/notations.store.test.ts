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

  it('strips image backgrounds before loading Notations into Presenter', () => {
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
    expect(presenterSlide.background).toEqual({
      type: 'solid',
      value: 'transparent',
      textTone: 'light',
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
})
