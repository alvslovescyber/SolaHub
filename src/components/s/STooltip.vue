<script setup lang="ts">
  import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

  interface Props {
    label: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
    delay?: number
  }

  const { placement = 'top', delay = 200 } = defineProps<Props>()

  const triggerRef = ref<HTMLElement | null>(null)
  const visible = ref(false)
  const tooltipStyle = ref<Record<string, string>>({})
  let timer: number | undefined
  let scrollCleanups: Array<() => void> = []

  function clearScrollListeners() {
    for (const u of scrollCleanups) u()
    scrollCleanups = []
  }

  /** Reposition when any scroll ancestor moves (sidebar nav uses overflow-y-auto and clips absolute tips). */
  function bindScrollAncestors() {
    clearScrollListeners()
    const el = triggerRef.value
    if (!el || typeof window === 'undefined') return

    const handle = () => {
      if (visible.value) computePosition()
    }

    window.addEventListener('scroll', handle, true)
    window.addEventListener('resize', handle)
    scrollCleanups.push(() => window.removeEventListener('scroll', handle, true))
    scrollCleanups.push(() => window.removeEventListener('resize', handle))

    let parent: HTMLElement | null = el.parentElement
    while (parent && parent !== document.body) {
      const { overflowY } = window.getComputedStyle(parent)
      if (overflowY === 'auto' || overflowY === 'scroll') {
        parent.addEventListener('scroll', handle, { passive: true })
        const p = parent
        scrollCleanups.push(() => p.removeEventListener('scroll', handle))
      }
      parent = parent.parentElement
    }
  }

  function computePosition() {
    const el = triggerRef.value
    if (!el || typeof window === 'undefined') return

    const rect = el.getBoundingClientRect()
    const gap = 6

    switch (placement) {
      case 'right':
        tooltipStyle.value = {
          position: 'fixed',
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + gap}px`,
          transform: 'translateY(-50%)',
          zIndex: '100',
        }
        break
      case 'left':
        tooltipStyle.value = {
          position: 'fixed',
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - gap}px`,
          transform: 'translate(-100%, -50%)',
          zIndex: '100',
        }
        break
      case 'bottom':
        tooltipStyle.value = {
          position: 'fixed',
          top: `${rect.bottom + gap}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)',
          zIndex: '100',
        }
        break
      default:
        tooltipStyle.value = {
          position: 'fixed',
          top: `${rect.top - gap}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translate(-50%, -100%)',
          zIndex: '100',
        }
    }
  }

  function show() {
    timer = window.setTimeout(() => {
      visible.value = true
      bindScrollAncestors()
      nextTick(() => computePosition())
    }, delay)
  }

  function hide() {
    window.clearTimeout(timer)
    visible.value = false
    clearScrollListeners()
  }

  watch(visible, (v) => {
    if (v) nextTick(() => computePosition())
  })

  onBeforeUnmount(() => {
    window.clearTimeout(timer)
    clearScrollListeners()
  })
</script>

<template>
  <span
    ref="triggerRef"
    class="inline-flex"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
  </span>

  <Teleport to="body">
    <Transition name="s-tooltip-fade">
      <span
        v-if="visible"
        :style="tooltipStyle"
        :class="[
          'px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none',
          'bg-ink-strong text-white shadow-pop max-w-[min(280px,calc(100vw-1rem))]',
        ]"
        role="tooltip"
      >
        {{ label }}
      </span>
    </Transition>
  </Teleport>
</template>

<style>
  .s-tooltip-fade-enter-active,
  .s-tooltip-fade-leave-active {
    transition: opacity 120ms ease;
  }

  .s-tooltip-fade-enter-from,
  .s-tooltip-fade-leave-to {
    opacity: 0;
  }
</style>
