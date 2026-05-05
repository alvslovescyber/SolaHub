<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted } from 'vue'
  import { BellOff, X } from 'lucide-vue-next'

  interface NotificationAnchorRect {
    top: number
    right: number
    bottom: number
    left: number
    width: number
    height: number
  }

  interface Props {
    open: boolean
    anchorRect?: NotificationAnchorRect | null
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{ close: [] }>()

  const PANEL_WIDTH = 320
  const PANEL_MIN_HEIGHT = 220
  const VIEWPORT_MARGIN = 12
  const ANCHOR_GAP = 8

  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max))
  }

  const panelStyle = computed(() => {
    const anchor = props.anchorRect
    if (!anchor || typeof window === 'undefined') {
      return {
        top: '52px',
        right: `${VIEWPORT_MARGIN}px`,
        width: `${PANEL_WIDTH}px`,
      }
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const canOpenBeside =
      anchor.left < viewportWidth / 2 &&
      anchor.right + ANCHOR_GAP + PANEL_WIDTH <= viewportWidth - VIEWPORT_MARGIN

    if (canOpenBeside) {
      return {
        top: `${clamp(anchor.top, VIEWPORT_MARGIN, viewportHeight - PANEL_MIN_HEIGHT)}px`,
        left: `${anchor.right + ANCHOR_GAP}px`,
        width: `${PANEL_WIDTH}px`,
        transformOrigin: 'left top',
      }
    }

    const left = clamp(
      anchor.right - PANEL_WIDTH,
      VIEWPORT_MARGIN,
      viewportWidth - PANEL_WIDTH - VIEWPORT_MARGIN
    )

    return {
      top: `${clamp(anchor.bottom + ANCHOR_GAP, VIEWPORT_MARGIN, viewportHeight - PANEL_MIN_HEIGHT)}px`,
      left: `${left}px`,
      width: `${PANEL_WIDTH}px`,
      transformOrigin: `${anchor.left + anchor.width / 2 - left}px top`,
    }
  })

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
  }
  onMounted(() => document.addEventListener('keydown', onKey))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="notif-panel">
      <div
        v-if="open"
        class="fixed inset-0 z-[200] pointer-events-none"
        @mousedown.self="emit('close')"
      >
        <!-- Click-away backdrop -->
        <div class="absolute inset-0 pointer-events-auto" @mousedown="emit('close')" />

        <!-- Panel anchored to the bell that opened it. -->
        <div
          data-testid="notification-panel"
          class="absolute pointer-events-auto rounded-xl border border-line bg-surface-overlay shadow-pop backdrop-blur-2xl overflow-hidden"
          :style="panelStyle"
          @mousedown.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-line-subtle">
            <p class="text-[13px] font-semibold text-ink-strong font-sans">Notifications</p>
            <button
              type="button"
              class="h-6 w-6 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-canvas hover:text-ink-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              aria-label="Close notifications"
              @click="emit('close')"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- Empty state -->
          <div class="flex flex-col items-center text-center px-4 py-8 text-ink-muted">
            <span
              class="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-surface-canvas mb-3"
            >
              <BellOff class="h-5 w-5" />
            </span>
            <p class="text-[13px] font-medium font-sans text-ink-strong">You're all clear</p>
            <p class="text-xs mt-1 leading-relaxed font-sans max-w-[220px]">
              Mentions, prayer requests, and church updates will appear here.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .notif-panel-enter-active {
    transition:
      opacity 150ms ease,
      transform 150ms ease;
  }
  .notif-panel-leave-active {
    transition:
      opacity 100ms ease,
      transform 100ms ease;
  }
  .notif-panel-enter-from,
  .notif-panel-leave-to {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
</style>
