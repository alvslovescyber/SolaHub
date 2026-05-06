<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
  import {
    DISPLAY_CHANNEL,
    DISPLAY_CLOSED_EVENT,
    DISPLAY_READY_EVENT,
    DISPLAY_STATE_EVENT,
    usePresenterStore,
    type PresenterDisplayClosed,
    type PresenterDisplayReady,
    type PresenterDisplayState,
  } from '@/stores/presenter.store'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import { SPresenterSlide } from '@/components/s'
  import { isTauri } from '@/lib/platform'

  const presenter = usePresenterStore()
  const biblePrefs = useBiblePreferencesStore()
  const slide = computed(() => presenter.currentSlide)
  const presenterRoot = ref<HTMLElement | null>(null)

  let channel: BroadcastChannel | null = null
  let unlistenDisplayEvent: (() => void) | null = null
  let unlistenWindowResize: (() => void) | null = null
  let mounted = false
  let displayClosedAnnounced = false

  onMounted(async () => {
    mounted = true
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(DISPLAY_CHANNEL)
      channel.onmessage = (message: MessageEvent<PresenterDisplayState>) => {
        if (message.data.type === 'state') {
          applyDisplayOnlyState(message.data)
        }
      }
    }

    const displayStateReady = listenForDisplayState()
    void listenForPresenterWindowMinimize()

    window.addEventListener('keydown', handleDisplayKeydown)

    await nextTick()
    presenterRoot.value?.focus({ preventScroll: true })
    await displayStateReady
    announceDisplayReady()
  })

  onBeforeUnmount(() => {
    mounted = false
    announceDisplayClosed()
    unlistenDisplayEvent?.()
    unlistenDisplayEvent = null
    unlistenWindowResize?.()
    unlistenWindowResize = null
    window.removeEventListener('keydown', handleDisplayKeydown)
    channel?.close()
    channel = null
  })

  async function listenForDisplayState(): Promise<void> {
    if (!isTauri) return

    try {
      const { listen } = await import('@tauri-apps/api/event')
      const unlisten = await listen<PresenterDisplayState>(DISPLAY_STATE_EVENT, (event) => {
        if (event.payload.type === 'state') {
          applyDisplayOnlyState(event.payload)
        }
      })

      if (mounted) {
        unlistenDisplayEvent = unlisten
      } else {
        unlisten()
      }
    } catch {
      // BroadcastChannel remains available as the browser/web fallback.
    }
  }

  async function listenForPresenterWindowMinimize(): Promise<void> {
    if (!isTauri) return

    try {
      const [{ invoke }, { getCurrentWindow }] = await Promise.all([
        import('@tauri-apps/api/core'),
        import('@tauri-apps/api/window'),
      ])
      const presenterWindow = getCurrentWindow()
      const closeIfMinimized = async () => {
        try {
          if (await presenterWindow.isMinimized()) {
            await invoke('close_presenter_window')
          }
        } catch {
          // Keep the visible presenter responsive if the native API is unavailable.
        }
      }
      const unlisten = await presenterWindow.onResized(() => {
        void closeIfMinimized()
      })

      if (mounted) {
        unlistenWindowResize = unlisten
      } else {
        unlisten()
      }
    } catch {
      // Browser display routes do not expose a native window lifecycle.
    }
  }

  function announceDisplayReady(): void {
    const ready = { type: 'ready' } satisfies PresenterDisplayReady
    channel?.postMessage(ready)

    if (!isTauri) return

    void import('@tauri-apps/api/event')
      .then(({ emit }) => emit(DISPLAY_READY_EVENT, ready))
      .catch(() => {
        // State retries remain in place if the native event channel is unavailable.
      })
  }

  function announceDisplayClosed(): void {
    if (displayClosedAnnounced) return
    displayClosedAnnounced = true

    const closed = { type: 'closed' } satisfies PresenterDisplayClosed
    channel?.postMessage(closed)

    if (!isTauri) return

    void import('@tauri-apps/api/event')
      .then(({ emit }) => emit(DISPLAY_CLOSED_EVENT, closed))
      .catch(() => {
        // The window is already closing; the main window also handles explicit close requests.
      })
  }

  function applyDisplayOnlyState(state: PresenterDisplayState): void {
    presenter.applyDisplayState({ ...state, planId: null })
  }

  function handleDisplayKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
      case 'Enter':
        event.preventDefault()
        presenter.next()
        break
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        event.preventDefault()
        presenter.prev()
        break
      case 'b':
      case 'B':
        event.preventDefault()
        presenter.toggleBlank()
        break
      case 'Escape':
        event.preventDefault()
        void closePresenterDisplay()
        break
      default:
        break
    }
  }

  async function closePresenterDisplay(): Promise<void> {
    announceDisplayClosed()

    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('close_presenter_window')
        return
      } catch {
        // Fall through to the browser fallback below.
      }
    }

    window.close()
    await presenter.closeDisplayWindow()
  }
</script>

<template>
  <div
    id="presenter-display-root"
    ref="presenterRoot"
    data-testid="presenter-display-root"
    tabindex="-1"
    :class="[
      'fixed inset-0 flex flex-col items-center justify-center select-none',
      presenter.isBlanked ? 'bg-black' : biblePrefs.presenterRootClass,
    ]"
    :style="presenter.isBlanked ? undefined : biblePrefs.presenterRootStyle"
  >
    <Transition name="presenter-fade" mode="out-in">
      <SPresenterSlide
        v-if="slide"
        :slide="slide"
        :slide-key="slide.verseRef"
        :blanked="presenter.isBlanked"
      />
    </Transition>
  </div>
</template>

<style scoped>
  .presenter-fade-enter-active,
  .presenter-fade-leave-active {
    transition: opacity 0.12s ease;
  }
  .presenter-fade-enter-from,
  .presenter-fade-leave-to {
    opacity: 0;
  }
</style>
