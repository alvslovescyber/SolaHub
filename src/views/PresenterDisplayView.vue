<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted } from 'vue'
  import {
    DISPLAY_CHANNEL,
    DISPLAY_STATE_EVENT,
    usePresenterStore,
    type PresenterDisplayState,
  } from '@/stores/presenter.store'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import { SPresenterSlide } from '@/components/s'
  import { collaborationService } from '@/services/collaboration.service'
  import { isTauri } from '@/lib/platform'

  const presenter = usePresenterStore()
  const biblePrefs = useBiblePreferencesStore()
  const slide = computed(() => presenter.currentSlide)

  let unsubscribe: (() => void) | null = null
  let channel: BroadcastChannel | null = null
  let unlistenDisplayEvent: (() => void) | null = null
  let mounted = false

  onMounted(() => {
    mounted = true
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(DISPLAY_CHANNEL)
      channel.onmessage = (message: MessageEvent<PresenterDisplayState>) => {
        if (message.data.type === 'state') {
          presenter.applyDisplayState(message.data)
        }
      }
    }

    void listenForDisplayState()

    unsubscribe = collaborationService.on((event) => {
      if (event.type === 'PresenterVerseChanged') {
        const idx = presenter.session.slides.findIndex((s) => s.verseRef === event.verseRef)
        if (idx !== -1) presenter.goTo(idx)
      }
    })
  })

  onBeforeUnmount(() => {
    mounted = false
    unsubscribe?.()
    unsubscribe = null
    unlistenDisplayEvent?.()
    unlistenDisplayEvent = null
    channel?.close()
    channel = null
  })

  async function listenForDisplayState(): Promise<void> {
    if (!isTauri) return

    try {
      const { listen } = await import('@tauri-apps/api/event')
      const unlisten = await listen<PresenterDisplayState>(DISPLAY_STATE_EVENT, (event) => {
        if (event.payload.type === 'state') {
          presenter.applyDisplayState(event.payload)
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
</script>

<template>
  <div
    :class="[
      'fixed inset-0 flex flex-col items-center justify-center select-none',
      biblePrefs.presenterRootClass,
    ]"
    :style="biblePrefs.presenterRootStyle"
  >
    <Transition name="presenter-fade" mode="out-in">
      <SPresenterSlide v-if="slide" :slide="slide" :slide-key="slide.verseRef" />
      <div v-else :key="'waiting'" class="text-slate-600 text-xl font-sans">
        Waiting for presenter…
      </div>
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
