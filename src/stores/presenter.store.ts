import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { PresenterSlide, PresenterSession } from '@/types/presenter.types'
import { collaborationService } from '@/services/collaboration.service'

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
  }

  function next(): void {
    if (isBlanked.value) {
      isBlanked.value = false
      return
    }
    if (hasNext.value) {
      session.value.currentIndex++
      broadcastCurrentVerse()
    }
  }

  function prev(): void {
    if (hasPrev.value) {
      session.value.currentIndex--
      isBlanked.value = false
      broadcastCurrentVerse()
    }
  }

  function goTo(index: number): void {
    if (index >= 0 && index < session.value.slides.length) {
      session.value.currentIndex = index
      isBlanked.value = false
      broadcastCurrentVerse()
    }
  }

  function toggleBlank(): void {
    isBlanked.value = !isBlanked.value
  }

  async function openDisplayWindow(_monitorIndex = 0): Promise<void> {
    isBlanked.value = false
    session.value.overlayOpen = true
  }

  function closeDisplayWindow(): void {
    session.value.overlayOpen = false
    session.value.displayWindowOpen = false
    isBlanked.value = false
  }

  function closeOverlay(): void {
    session.value.overlayOpen = false
    isBlanked.value = false
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
    } catch { /* fullscreen not supported or blocked */ }
  }

  function broadcastCurrentVerse(): void {
    const slide = currentSlide.value
    const planId = session.value.planId
    if (!slide || !planId) return
    void collaborationService.pushPresenterVerse(planId, slide.verseRef)
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
    openDisplayWindow,
    closeDisplayWindow,
    closeOverlay,
    toggleFullscreen,
  }
})
