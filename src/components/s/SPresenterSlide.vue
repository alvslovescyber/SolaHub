<script setup lang="ts">
  import { computed } from 'vue'
  import { Monitor } from 'lucide-vue-next'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import { isNotationSlide, isScriptureSlide, isSongSlide } from '@/types/presenter.types'
  import type { PresenterSlide } from '@/types/presenter.types'
  import SNotationSlideCanvas from './SNotationSlideCanvas.vue'

  const props = withDefaults(
    defineProps<{
      slide: PresenterSlide | null
      /** Drives the Transition key — pass presenter.session.currentIndex */
      slideKey: string | number
      /**
       * true  → pixel-based font sizes (for the 1920×1080 scale-transform canvas preview)
       * false → vw-based clamp sizes (for fullscreen overlays at any viewport size)
       */
      canvasMode?: boolean
      /** Show an empty-state placeholder when slide is null */
      showEmpty?: boolean
      blanked?: boolean
    }>(),
    {
      canvasMode: false,
      showEmpty: false,
      blanked: false,
    }
  )

  const biblePrefs = useBiblePreferencesStore()

  // Narrowed accessors — safe field access after discriminating on source
  const scripture = computed(() =>
    props.slide && isScriptureSlide(props.slide) ? props.slide : null
  )
  const song = computed(() => (props.slide && isSongSlide(props.slide) ? props.slide : null))
  const notation = computed(() =>
    props.slide && isNotationSlide(props.slide) ? props.slide : null
  )

  const textStyle = computed(() =>
    props.canvasMode
      ? { fontSize: `${biblePrefs.presenterCanvasFontPx}px` }
      : { fontSize: biblePrefs.presenterVerseFontSize }
  )

  const refStyle = computed(() =>
    props.canvasMode
      ? { fontSize: `${biblePrefs.presenterCanvasRefPx}px`, marginTop: '56px' }
      : { fontSize: biblePrefs.presenterRefFontSize, marginTop: '2.5rem' }
  )

  const labelStyle = computed(() =>
    props.canvasMode
      ? { fontSize: `${biblePrefs.presenterCanvasLabelPx}px`, marginBottom: '48px' }
      : { marginBottom: '2rem' }
  )

  const footerStyle = computed(() =>
    props.canvasMode
      ? { fontSize: `${biblePrefs.presenterCanvasLabelPx}px`, marginTop: '56px' }
      : { marginTop: '2.5rem' }
  )

  const notationMode = computed(() => (props.canvasMode ? 'canvas' : 'display'))
</script>

<template>
  <Transition name="presenter-fade" mode="out-in">
    <!-- Blanked: render an invisible element so out-in transition works -->
    <div v-if="blanked" :key="'blanked'" />

    <!-- Notation slide -->
    <SNotationSlideCanvas
      v-else-if="notation"
      :key="slideKey"
      class="overflow-hidden shadow-modal"
      :slide="notation"
      :mode="notationMode"
    />

    <!-- Slide content -->
    <div
      v-else-if="scripture || song"
      :key="slideKey"
      :class="
        canvasMode ? 'text-center' : 'text-center w-full max-w-5xl px-[clamp(1.5rem,6vw,4rem)]'
      "
      :style="canvasMode ? { maxWidth: '1600px', padding: '0 160px' } : undefined"
    >
      <!-- Song section label -->
      <p
        v-if="song"
        class="text-slate-500 font-sans font-medium uppercase tracking-widest"
        :style="labelStyle"
      >
        {{ song.sectionLabel }}
      </p>

      <!-- Main text -->
      <p class="text-white font-serif leading-tight whitespace-pre-line" :style="textStyle">
        {{ scripture?.text ?? song?.text }}
      </p>

      <!-- Scripture reference -->
      <p
        v-if="scripture && biblePrefs.presenterShowVerseRef"
        class="text-slate-400 font-sans font-medium"
        :style="refStyle"
      >
        {{ scripture.book }} {{ scripture.chapter }}:{{ scripture.verse }}
      </p>

      <!-- Song title footer -->
      <p
        v-if="song"
        class="text-slate-500 font-sans uppercase tracking-wider"
        :class="canvasMode ? 'text-[24px]' : 'text-xs'"
        :style="footerStyle"
      >
        {{ song.songTitle }}
      </p>
    </div>

    <!-- Empty state (canvas preview only) -->
    <div v-else-if="showEmpty" :key="'empty'" class="flex flex-col items-center gap-6 text-center">
      <Monitor
        class="text-slate-700"
        :style="canvasMode ? { width: '80px', height: '80px' } : { width: '3rem', height: '3rem' }"
      />
      <p
        class="text-slate-600 font-sans"
        :style="canvasMode ? { fontSize: '28px' } : undefined"
        :class="canvasMode ? '' : 'text-xl'"
      >
        Select a chapter or song to begin
      </p>
    </div>
  </Transition>
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
