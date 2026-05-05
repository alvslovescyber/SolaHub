import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { PresenterSlide, PresenterSession } from '@/types/presenter.types'
import { collaborationService } from '@/services/collaboration.service'
import { isTauri } from '@/lib/platform'
import { isBrowserOffline } from '@/lib/networkStatus'

const DISPLAY_CHANNEL = 'solahub:presenter-display'
const DISPLAY_STATE_EVENT = 'solahub:presenter-display-state'
const DISPLAY_READY_EVENT = 'solahub:presenter-display-ready'
const DISPLAY_CLOSED_EVENT = 'solahub:presenter-display-closed'
const DISPLAY_SYNC_RETRY_MS = [250, 750, 1500, 3000]

export interface PresenterDisplayState {
  type: 'state'
  slides: PresenterSlide[]
  currentIndex: number
  isBlanked: boolean
  planId: string | null
}

export interface PresenterDisplayReady {
  type: 'ready'
}

export interface PresenterDisplayClosed {
  type: 'closed'
}

export interface LoadSlidesOptions {
  clearOnDisplayClose?: boolean
}

type PresenterDisplayMessage =
  | PresenterDisplayState
  | PresenterDisplayReady
  | PresenterDisplayClosed

export const usePresenterStore = defineStore('presenter', () => {
  const session = ref<PresenterSession>({
    planId: null,
    slides: [],
    currentIndex: 0,
    isFullscreen: false,
    displayWindowOpen: false,
    overlayOpen: false,
  })

  const isBlanked = ref(false)
  const displayChannel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(DISPLAY_CHANNEL)
  let unlistenDisplayReady: (() => void) | null = null
  let unlistenDisplayClosed: (() => void) | null = null
  let unlistenMainWindowResize: (() => void) | null = null
  let mainWindowWatcherPromise: Promise<void> | null = null
  const clearSlidesOnDisplayClose = ref(false)

  if (displayChannel) {
    displayChannel.onmessage = (message: MessageEvent<PresenterDisplayMessage>) => {
      if (message.data.type === 'ready' && session.value.slides.length > 0) {
        syncDisplayState()
        return
      }
      if (message.data.type === 'closed') {
        markDisplayClosed()
      }
    }
  }

  const currentSlide = computed<PresenterSlide | null>(
    () => session.value.slides[session.value.currentIndex] ?? null
  )

  const hasNext = computed(() => session.value.currentIndex < session.value.slides.length - 1)
  const hasPrev = computed(() => session.value.currentIndex > 0)
  const progress = computed(() =>
    session.value.slides.length > 0
      ? ((session.value.currentIndex + 1) / session.value.slides.length) * 100
      : 0
  )

  function loadSlides(
    slides: PresenterSlide[],
    planId: string | null = null,
    startIndex = 0,
    options: LoadSlidesOptions = {}
  ): void {
    const currentIndex =
      slides.length === 0 ? 0 : Math.min(Math.max(Math.trunc(startIndex), 0), slides.length - 1)

    session.value = {
      ...session.value,
      slides,
      currentIndex,
      planId,
    }
    isBlanked.value = false
    clearSlidesOnDisplayClose.value = options.clearOnDisplayClose === true
    syncDisplayState()
  }

  function clearSlides(): void {
    session.value = {
      ...session.value,
      slides: [],
      currentIndex: 0,
      planId: null,
    }
    isBlanked.value = false
    clearSlidesOnDisplayClose.value = false
    syncDisplayState()
  }

  function next(): void {
    if (isBlanked.value) {
      isBlanked.value = false
      syncDisplayState()
      return
    }
    if (hasNext.value) {
      session.value.currentIndex++
      broadcastCurrentVerse()
      syncDisplayState()
    }
  }

  function prev(): void {
    if (hasPrev.value) {
      session.value.currentIndex--
      isBlanked.value = false
      broadcastCurrentVerse()
      syncDisplayState()
    }
  }

  function goTo(index: number): void {
    if (index >= 0 && index < session.value.slides.length) {
      session.value.currentIndex = index
      isBlanked.value = false
      broadcastCurrentVerse()
      syncDisplayState()
    }
  }

  function toggleBlank(): void {
    isBlanked.value = !isBlanked.value
    syncDisplayState()
  }

  function openOverlay(): void {
    isBlanked.value = false
    session.value.displayWindowOpen = false
    session.value.overlayOpen = true
    syncDisplayState()
  }

  async function openDisplayWindow(monitorIndex = 0): Promise<void> {
    isBlanked.value = false
    if (isTauri) {
      await listenForDisplayLifecycle()
      await invoke('open_presenter_window', {
        url: '/#/presenter-display',
        monitorIndex,
      })
      session.value.displayWindowOpen = true
      await listenForMainWindowMinimize()
      syncDisplayState()
      DISPLAY_SYNC_RETRY_MS.forEach((delay) => window.setTimeout(syncDisplayState, delay))
      return
    }
    session.value.overlayOpen = true
    syncDisplayState()
  }

  async function closeDisplayWindow(): Promise<void> {
    stopMainWindowMinimizeWatcher()
    stopDisplayLifecycleListeners()
    if (isTauri && session.value.displayWindowOpen) {
      await invoke('close_presenter_window')
    }
    markDisplayClosed()
  }

  function closeOverlay(): void {
    stopMainWindowMinimizeWatcher()
    markDisplayClosed()
  }

  async function toggleFullscreen(): Promise<void> {
    const entering = !session.value.isFullscreen
    try {
      if (entering) {
        await document.documentElement.requestFullscreen?.()
      } else {
        await document.exitFullscreen?.()
      }
      session.value.isFullscreen = entering
    } catch {
      /* fullscreen not supported or blocked */
    }
  }

  function markDisplayClosed(): void {
    stopMainWindowMinimizeWatcher()
    stopDisplayLifecycleListeners()
    session.value.overlayOpen = false
    session.value.displayWindowOpen = false
    isBlanked.value = false

    if (clearSlidesOnDisplayClose.value) {
      session.value = {
        ...session.value,
        slides: [],
        currentIndex: 0,
        planId: null,
      }
      clearSlidesOnDisplayClose.value = false
    }

    syncDisplayState()
  }

  function applyDisplayState(state: PresenterDisplayState): void {
    session.value = {
      ...session.value,
      slides: state.slides.map((slide) => ({ ...slide })),
      currentIndex: state.currentIndex,
      planId: state.planId,
    }
    isBlanked.value = state.isBlanked
  }

  function syncDisplayState(): void {
    const state = {
      type: 'state',
      slides: session.value.slides.map((slide) => ({ ...slide })),
      currentIndex: session.value.currentIndex,
      isBlanked: isBlanked.value,
      planId: session.value.planId,
    } satisfies PresenterDisplayState

    if (displayChannel) {
      try {
        displayChannel.postMessage(state)
      } catch {
        // Local presentation must keep working even if a large/custom slide
        // background cannot be cloned into the secondary display channel.
      }
    }

    void emitDisplayState(state)
  }

  async function listenForDisplayLifecycle(): Promise<void> {
    if (!isTauri || (unlistenDisplayReady && unlistenDisplayClosed)) return

    try {
      const { listen } = await import('@tauri-apps/api/event')
      if (!unlistenDisplayReady) {
        unlistenDisplayReady = await listen<PresenterDisplayReady>(DISPLAY_READY_EVENT, () => {
          syncDisplayState()
        })
      }
      if (!unlistenDisplayClosed) {
        unlistenDisplayClosed = await listen<PresenterDisplayClosed>(DISPLAY_CLOSED_EVENT, () => {
          markDisplayClosed()
        })
      }
    } catch {
      // BroadcastChannel retries still cover the browser fallback and boot races.
    }
  }

  async function listenForMainWindowMinimize(): Promise<void> {
    if (!isTauri || unlistenMainWindowResize || mainWindowWatcherPromise) {
      await mainWindowWatcherPromise
      return
    }

    mainWindowWatcherPromise = (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const mainWindow = getCurrentWindow()
        const closeIfMinimized = async () => {
          try {
            if (await mainWindow.isMinimized()) {
              await closeDisplayWindow()
            }
          } catch {
            // If the native query fails, leave presentation control responsive.
          }
        }

        const unlisten = await mainWindow.onResized(() => {
          void closeIfMinimized()
        })

        if (session.value.displayWindowOpen) {
          unlistenMainWindowResize = unlisten
        } else {
          unlisten()
        }
      } catch {
        // Some browser/test contexts do not expose the native window API.
      } finally {
        mainWindowWatcherPromise = null
      }
    })()

    await mainWindowWatcherPromise
  }

  function stopMainWindowMinimizeWatcher(): void {
    unlistenMainWindowResize?.()
    unlistenMainWindowResize = null
  }

  function stopDisplayLifecycleListeners(): void {
    unlistenDisplayReady?.()
    unlistenDisplayReady = null
    unlistenDisplayClosed?.()
    unlistenDisplayClosed = null
  }

  function broadcastCurrentVerse(): void {
    const slide = currentSlide.value
    const planId = session.value.planId
    if (!slide || !planId) return
    if (isBrowserOffline()) return
    void collaborationService.pushPresenterVerse(planId, slide.verseRef).catch(() => {
      // Local presentation controls must keep working when collaboration sync is unavailable.
    })
  }

  return {
    session,
    isBlanked,
    currentSlide,
    hasNext,
    hasPrev,
    progress,
    loadSlides,
    clearSlides,
    next,
    prev,
    goTo,
    toggleBlank,
    openOverlay,
    openDisplayWindow,
    closeDisplayWindow,
    closeOverlay,
    toggleFullscreen,
    applyDisplayState,
    syncDisplayState,
  }
})

async function emitDisplayState(state: PresenterDisplayState): Promise<void> {
  if (!isTauri) return

  try {
    const { emitTo } = await import('@tauri-apps/api/event')
    await emitTo('presenter', DISPLAY_STATE_EVENT, state)
  } catch {
    // The presenter window may still be booting; openDisplayWindow retries the
    // same state shortly after creation so the display can catch up.
  }
}

export { DISPLAY_CHANNEL, DISPLAY_CLOSED_EVENT, DISPLAY_READY_EVENT, DISPLAY_STATE_EVENT }
