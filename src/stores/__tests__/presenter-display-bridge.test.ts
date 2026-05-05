import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScriptureSlide } from '@/types/presenter.types'

const bridgeMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  emitTo: vi.fn(),
  pushPresenterVerse: vi.fn(),
  onCollaboration: vi.fn(() => vi.fn()),
}))

function makeSlide(): ScriptureSlide {
  return {
    source: 'scripture',
    verseRef: 'John.3.16',
    text: 'For God so loved the world',
    book: 'John',
    chapter: 3,
    verse: 16,
  }
}

async function loadPresenterStoreInTauri() {
  vi.resetModules()
  vi.doMock('@/lib/platform', () => ({
    isTauri: true,
    isMac: false,
    modKeyLabel: 'Ctrl',
  }))
  vi.doMock('@tauri-apps/api/core', () => ({
    invoke: bridgeMocks.invoke,
  }))
  vi.doMock('@tauri-apps/api/event', () => ({
    emitTo: bridgeMocks.emitTo,
  }))
  vi.doMock('@/services/collaboration.service', () => ({
    collaborationService: {
      pushPresenterVerse: bridgeMocks.pushPresenterVerse,
      on: bridgeMocks.onCollaboration,
    },
  }))

  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  return import('../presenter.store')
}

describe('presenter display bridge', () => {
  beforeEach(() => {
    bridgeMocks.invoke.mockResolvedValue(undefined)
    bridgeMocks.emitTo.mockResolvedValue(undefined)
    bridgeMocks.pushPresenterVerse.mockResolvedValue(undefined)
    bridgeMocks.onCollaboration.mockReturnValue(vi.fn())
  })

  afterEach(() => {
    vi.resetModules()
    vi.useRealTimers()
  })

  it('emits slide state to the Tauri presenter webview', async () => {
    const { DISPLAY_STATE_EVENT, usePresenterStore } = await loadPresenterStoreInTauri()
    const store = usePresenterStore()

    store.loadSlides([makeSlide()])

    await vi.waitFor(() => {
      expect(bridgeMocks.emitTo).toHaveBeenCalledWith(
        'presenter',
        DISPLAY_STATE_EVENT,
        expect.objectContaining({
          type: 'state',
          currentIndex: 0,
          isBlanked: false,
          slides: [expect.objectContaining({ verseRef: 'John.3.16' })],
        })
      )
    })
  })

  it('opens the presenter window on the selected monitor', async () => {
    const { usePresenterStore } = await loadPresenterStoreInTauri()
    const store = usePresenterStore()

    await store.openDisplayWindow(2)

    expect(bridgeMocks.invoke).toHaveBeenCalledWith('open_presenter_window', {
      url: '/#/presenter-display',
      monitorIndex: 2,
    })
    expect(store.session.displayWindowOpen).toBe(true)
  })
})
