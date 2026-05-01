import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { PresenterSlide, PresenterSession } from '@/types/presenter.types'
import { collaborationService } from '@/services/collaboration.service'

export const usePresenterStore = defineStore('presenter', () => {
  const session = ref<PresenterSession>({
    planId: null,
    slides: [],
    currentIndex: 0,
    isFullscreen: false,
    displayWindowOpen: false,
  })

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
  }

  function next(): void {
    if (hasNext.value) {
      session.value.currentIndex++
      broadcastCurrentVerse()
    }
  }

  function prev(): void {
    if (hasPrev.value) {
      session.value.currentIndex--
      broadcastCurrentVerse()
    }
  }

  function goTo(index: number): void {
    if (index >= 0 && index < session.value.slides.length) {
      session.value.currentIndex = index
      broadcastCurrentVerse()
    }
  }

  async function openDisplayWindow(): Promise<void> {
    await invoke('open_presenter_window')
    session.value.displayWindowOpen = true
  }

  async function closeDisplayWindow(): Promise<void> {
    await invoke('close_presenter_window')
    session.value.displayWindowOpen = false
  }

  async function toggleFullscreen(): Promise<void> {
    const next = !session.value.isFullscreen
    await invoke('set_fullscreen', { fullscreen: next })
    session.value.isFullscreen = next
  }

  function broadcastCurrentVerse(): void {
    const slide = currentSlide.value
    const planId = session.value.planId
    if (!slide || !planId) return

    void collaborationService.pushPresenterVerse(planId, slide.verseRef)
  }

  return {
    session,
    currentSlide,
    hasNext,
    hasPrev,
    progress,
    loadSlides,
    next,
    prev,
    goTo,
    openDisplayWindow,
    closeDisplayWindow,
    toggleFullscreen,
  }
})
