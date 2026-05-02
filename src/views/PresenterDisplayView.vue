<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted } from 'vue'
  import { usePresenterStore } from '@/stores/presenter.store'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
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
      name="fade"
      mode="out-in"
    >
      <div
        v-if="slide"
        :key="slide.verseRef"
        class="text-center px-12 max-w-5xl"
      >
        <p
          class="presenter-slide text-white"
          :style="{ fontSize: biblePrefs.presenterVerseFontSize }"
        >
          {{ slide.text }}
        </p>
        <p
          v-if="biblePrefs.presenterShowVerseRef"
          class="text-slate-400 font-medium mt-8"
          :style="{ fontSize: biblePrefs.presenterRefFontSize }"
        >
          {{ slide.book }} {{ slide.chapter }}:{{ slide.verse }}
        </p>
      </div>
      <div
        v-else
        class="text-slate-600 text-xl"
      >
        Waiting for presenter…
      </div>
    </Transition>
  </div>
</template>
