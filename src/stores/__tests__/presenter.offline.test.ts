import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScriptureSlide } from '@/types/presenter.types'

const presenterMocks = vi.hoisted(() => ({
  pushPresenterVerse: vi.fn(),
  onCollaboration: vi.fn(() => vi.fn()),
}))

vi.mock('@/services/collaboration.service', () => ({
  collaborationService: {
    pushPresenterVerse: presenterMocks.pushPresenterVerse,
    on: presenterMocks.onCollaboration,
  },
}))

function makeSlide(verse: number): ScriptureSlide {
  return {
    source: 'scripture',
    verseRef: `John.3.${verse}`,
    text: `Verse ${verse}`,
    book: 'John',
    chapter: 3,
    verse,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  setOnlineStatus(true)
  presenterMocks.pushPresenterVerse.mockResolvedValue(undefined)
})

describe('presenter offline collaboration behavior', () => {
  it('does not attempt collaboration sync while offline', async () => {
    setOnlineStatus(false)
    const { usePresenterStore } = await import('../presenter.store')
    const store = usePresenterStore()

    store.loadSlides([makeSlide(16), makeSlide(17)], 'plan-1')
    store.next()

    expect(store.session.currentIndex).toBe(1)
    expect(presenterMocks.pushPresenterVerse).not.toHaveBeenCalled()
  })

  it('keeps local navigation working when collaboration sync rejects', async () => {
    presenterMocks.pushPresenterVerse.mockRejectedValue(new Error('network unavailable'))
    const { usePresenterStore } = await import('../presenter.store')
    const store = usePresenterStore()

    store.loadSlides([makeSlide(16), makeSlide(17)], 'plan-1')
    expect(() => store.next()).not.toThrow()
    await Promise.resolve()

    expect(store.session.currentIndex).toBe(1)
    expect(presenterMocks.pushPresenterVerse).toHaveBeenCalledWith('plan-1', 'John.3.17')
  })
})

function setOnlineStatus(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  })
}
