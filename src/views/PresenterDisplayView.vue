<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted } from 'vue'
  import { usePresenterStore } from '@/stores/presenter.store'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import { SPresenterSlide } from '@/components/s'
  import { collaborationService } from '@/services/collaboration.service'

  const presenter = usePresenterStore()
  const biblePrefs = useBiblePreferencesStore()
  const slide = computed(() => presenter.currentSlide)

  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = collaborationService.on((event) => {
      if (event.type === 'PresenterVerseChanged') {
        const idx = presenter.session.slides.findIndex((s) => s.verseRef === event.verseRef)
        if (idx !== -1) presenter.goTo(idx)
      }
    })
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
    unsubscribe = null
  })
</script>

<template>
  <div
    :class="[
      'fixed inset-0 flex flex-col items-center justify-center select-none',
      biblePrefs.presenterRootClass,
    ]"
  >
    <Transition
      name="presenter-fade"
      mode="out-in"
    >
      <SPresenterSlide
        v-if="slide"
        :slide="slide"
        :slide-key="slide.verseRef"
      />
      <div
        v-else
        :key="'waiting'"
        class="text-slate-600 text-xl font-sans"
      >
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
