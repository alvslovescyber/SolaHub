import { beforeEach, describe, expect, it } from 'vitest'
import { useBiblePreferencesStore } from '../biblePreferences.store'

describe('bible preferences store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('preserves imported presenter background data URLs instead of truncating them', () => {
    const store = useBiblePreferencesStore()
    const dataUrl = `linear-gradient(rgba(2, 6, 23, 0.32), rgba(2, 6, 23, 0.32)), url("data:image/png;base64,${'a'.repeat(
      1200
    )}") center / cover`

    store.setPresenterCustomBackground(dataUrl)
    store.setPresenterBackground('custom')

    expect(store.presenterCustomBackground).toBe(dataUrl)
    expect(store.presenterBackgroundCss).toBe(dataUrl)
  })

  it('exposes live motion presenter backgrounds with the motion class', () => {
    const store = useBiblePreferencesStore()

    store.setPresenterBackground('aurora')

    expect(store.presenterRootClass).toContain('solahub-motion-background')
    expect(store.presenterBackgroundCss).toContain('radial-gradient')
  })
})
