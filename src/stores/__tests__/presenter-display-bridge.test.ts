import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScriptureSlide } from '@/types/presenter.types'

const bridgeMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
  emitTo: vi.fn(),
  onResized: vi.fn(),
  isMinimized: vi.fn(),
  windowUnlisten: vi.fn(),
  windowResizeHandler: null as (() => void) | null,
  displayReadyHandler: null as (() => void) | null,
  displayClosedHandler: null as (() => void) | null,
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
    listen: bridgeMocks.listen,
    emitTo: bridgeMocks.emitTo,
  }))
  vi.doMock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
      onResized: bridgeMocks.onResized,
      isMinimized: bridgeMocks.isMinimized,
    }),
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
    bridgeMocks.invoke.mockReset()
    bridgeMocks.invoke.mockResolvedValue(undefined)
    bridgeMocks.listen.mockReset()
    bridgeMocks.listen.mockImplementation((eventName, handler) => {
      if (String(eventName).includes('closed')) {
        bridgeMocks.displayClosedHandler = handler
      } else {
        bridgeMocks.displayReadyHandler = handler
      }
      return Promise.resolve(vi.fn())
    })
    bridgeMocks.emitTo.mockReset()
    bridgeMocks.emitTo.mockResolvedValue(undefined)
    bridgeMocks.onResized.mockReset()
    bridgeMocks.onResized.mockImplementation((handler) => {
      bridgeMocks.windowResizeHandler = handler
      return Promise.resolve(bridgeMocks.windowUnlisten)
    })
    bridgeMocks.isMinimized.mockReset()
    bridgeMocks.isMinimized.mockResolvedValue(false)
    bridgeMocks.windowUnlisten.mockReset()
    bridgeMocks.windowResizeHandler = null
    bridgeMocks.displayReadyHandler = null
    bridgeMocks.displayClosedHandler = null
    bridgeMocks.pushPresenterVerse.mockReset()
    bridgeMocks.pushPresenterVerse.mockResolvedValue(undefined)
    bridgeMocks.onCollaboration.mockReset()
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

  it('resends the active slide state when the native display announces readiness', async () => {
    const { usePresenterStore } = await loadPresenterStoreInTauri()
    const store = usePresenterStore()

    store.loadSlides([makeSlide()])
    await store.openDisplayWindow(0)
    bridgeMocks.emitTo.mockClear()

    bridgeMocks.displayReadyHandler?.()

    await vi.waitFor(() => {
      expect(bridgeMocks.emitTo).toHaveBeenCalledWith(
        'presenter',
        expect.any(String),
        expect.objectContaining({
          type: 'state',
          slides: [expect.objectContaining({ verseRef: 'John.3.16' })],
        })
      )
    })
  })

  it('closes the native presenter window when the main window is minimized', async () => {
    const { usePresenterStore } = await loadPresenterStoreInTauri()
    const store = usePresenterStore()

    await store.openDisplayWindow(1)

    expect(bridgeMocks.onResized).toHaveBeenCalled()
    bridgeMocks.invoke.mockClear()
    bridgeMocks.isMinimized.mockResolvedValue(true)

    bridgeMocks.windowResizeHandler?.()

    await vi.waitFor(() => {
      expect(bridgeMocks.invoke).toHaveBeenCalledWith('close_presenter_window')
    })
    expect(store.session.displayWindowOpen).toBe(false)
    expect(bridgeMocks.windowUnlisten).toHaveBeenCalledOnce()
  })

  it('marks the display closed when the native presenter window announces shutdown', async () => {
    const { usePresenterStore } = await loadPresenterStoreInTauri()
    const store = usePresenterStore()

    await store.openDisplayWindow(1)
    expect(store.session.displayWindowOpen).toBe(true)

    bridgeMocks.displayClosedHandler?.()

    expect(store.session.displayWindowOpen).toBe(false)
  })
})
