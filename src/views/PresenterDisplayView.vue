<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePresenterStore } from '@/stores/presenter.store'
import { collaborationService } from '@/services/collaboration.service'

const presenter = usePresenterStore()
const slide = computed(() => presenter.currentSlide)

onMounted(() => {
  // Listen for verse updates pushed from the control window via collaboration hub
  collaborationService.on((event) => {
    if (event.type === 'PresenterVerseChanged') {
      // Navigate to the pushed slide if it exists in the current deck
      const idx = presenter.session.slides.findIndex(
        (s) => s.verseRef === event.verseRef,
      )
      if (idx !== -1) presenter.goTo(idx)
    }
  })
})
</script>

<template>
  <div class="fixed inset-0 bg-black flex flex-col items-center justify-center select-none">
    <Transition name="fade" mode="out-in">
      <div v-if="slide" :key="slide.verseRef" class="text-center px-12 max-w-5xl">
        <p class="presenter-slide text-white">{{ slide.text }}</p>
        <p class="text-slate-400 text-xl mt-8 font-medium">
          {{ slide.book }} {{ slide.chapter }}:{{ slide.verse }}
        </p>
      </div>
      <div v-else class="text-slate-600 text-xl">Waiting for presenter…</div>
    </Transition>
  </div>
</template>
