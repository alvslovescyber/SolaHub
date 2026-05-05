import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { PresenterSlide, PresenterSession } from '@/types/presenter.types'
import { collaborationService } from '@/services/collaboration.service'
import { isTauri } from '@/lib/platform'
import { isBrowserOffline } from '@/lib/networkStatus'

const DISPLAY_CHANNEL = 'solahub:presenter-display'
const DISPLAY_STATE_EVENT = 'solahub:presenter-display-state'
const DISPLAY_SYNC_RETRY_MS = [250, 750, 1500, 3000]

export interface PresenterDisplayState {
  type: 'state'
  slides: PresenterSlide[]
  currentIndex: number
  isBlanked: boolean
  planId: string | null
}

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

  function loadSlides(slides: PresenterSlide[], planId: string | null = null): void {
    session.value = {
      ...session.value,
      slides,
      currentIndex: 0,
      planId,
    }
    isBlanked.value = false
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
      await invoke('open_presenter_window', {
        url: '/#/presenter-display',
        monitorIndex,
      })
      session.value.displayWindowOpen = true
      syncDisplayState()
      DISPLAY_SYNC_RETRY_MS.forEach((delay) => window.setTimeout(syncDisplayState, delay))
      return
    }
    session.value.overlayOpen = true
    syncDisplayState()
  }

  async function closeDisplayWindow(): Promise<void> {
    if (isTauri && session.value.displayWindowOpen) {
      await invoke('close_presenter_window')
    }
    session.value.overlayOpen = false
    session.value.displayWindowOpen = false
    isBlanked.value = false
    syncDisplayState()
  }

  function closeOverlay(): void {
    session.value.overlayOpen = false
    isBlanked.value = false
    syncDisplayState()
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

export { DISPLAY_CHANNEL, DISPLAY_STATE_EVENT }
