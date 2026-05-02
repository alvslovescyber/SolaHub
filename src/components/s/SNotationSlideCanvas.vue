<script setup lang="ts">
  import { computed } from 'vue'
  import type { CSSProperties } from 'vue'
  import { backgroundStyle, mutedSlideColor } from '@/lib/presenterBackgrounds'
  import type { NotationElement, NotationSlide } from '@/types/presenter.types'

  type CanvasMode = 'fill' | 'canvas' | 'display'

  const props = withDefaults(
    defineProps<{
      slide: NotationSlide
      mode?: CanvasMode
      interactive?: boolean
      selectedElementId?: string | null
    }>(),
    {
      mode: 'fill',
      interactive: false,
      selectedElementId: null,
    }
  )

  const emit = defineEmits<{
    canvasPointerDown: [event: PointerEvent]
    elementPointerDown: [event: PointerEvent, element: NotationElement]
  }>()

  const stageStyle = computed<CSSProperties>(() => {
    const bg = backgroundStyle(props.slide.background)
    if (props.mode === 'canvas') {
      return { ...bg, width: '1920px', height: '1080px' }
    }
    if (props.mode === 'display') {
      return { ...bg, width: 'min(100vw, 177.7778vh)', height: 'min(56.25vw, 100vh)' }
    }
    return { ...bg, width: '100%', height: '100%' }
  })

  function elementStyle(element: NotationElement): CSSProperties {
    return {
      left: `${element.x}%`,
      top: `${element.y}%`,
      width: `${element.width}%`,
      minHeight: `${element.height}%`,
      color: element.color,
      textAlign: element.align,
      fontSize: `calc(${element.fontSize / 10.8}cqh)`,
      fontWeight:
        element.fontWeight === 'bold' ? '700' : element.fontWeight === 'medium' ? '500' : '400',
    }
  }
</script>

<template>
  <div
    class="notation-stage relative overflow-hidden"
    :style="stageStyle"
    @pointerdown.self="emit('canvasPointerDown', $event)"
  >
    <template v-for="element in slide.elements" :key="element.id">
      <button
        v-if="interactive"
        type="button"
        :class="[
          'notation-element absolute flex cursor-move flex-col justify-center whitespace-pre-line break-words rounded-md border border-transparent p-[1.4cqw] text-left leading-tight transition-shadow',
          selectedElementId === element.id
            ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-transparent'
            : 'hover:ring-1 hover:ring-white/50',
        ]"
        :style="elementStyle(element)"
        @pointerdown.stop="emit('elementPointerDown', $event, element)"
      >
        <template v-if="element.kind === 'verse'">
          <span
            v-if="element.showReference"
            class="mb-[0.55em] font-sans text-[0.42em] uppercase tracking-wider"
            :style="{ color: mutedSlideColor(slide.background.textTone) }"
          >
            {{ element.reference }}
          </span>
          <span class="font-serif">{{ element.text }}</span>
        </template>
        <span v-else class="font-sans">{{ element.text }}</span>
      </button>

      <div
        v-else
        class="notation-element absolute flex flex-col justify-center whitespace-pre-line break-words p-[1.4cqw] leading-tight"
        :style="elementStyle(element)"
      >
        <template v-if="element.kind === 'verse'">
          <span
            v-if="element.showReference"
            class="mb-[0.55em] font-sans text-[0.42em] uppercase tracking-wider"
            :style="{ color: mutedSlideColor(slide.background.textTone) }"
          >
            {{ element.reference }}
          </span>
          <span class="font-serif">{{ element.text }}</span>
        </template>
        <span v-else class="font-sans">{{ element.text }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
  .notation-stage {
    container-type: size;
  }

  .notation-element {
    touch-action: none;
    user-select: none;
  }
</style>
