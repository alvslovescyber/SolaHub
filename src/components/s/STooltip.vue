<script setup lang="ts">
  import { ref } from 'vue'

  interface Props {
    label: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
    delay?: number
  }

  const { placement = 'top', delay = 200 } = defineProps<Props>()

  const visible = ref(false)
  let timer: number | undefined

  function show() {
    timer = window.setTimeout(() => (visible.value = true), delay)
  }
  function hide() {
    window.clearTimeout(timer)
    visible.value = false
  }

  const placementClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[placement]
</script>

<template>
  <span
    class="relative inline-flex"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <Transition name="fade">
      <span
        v-if="visible"
        :class="[
          'absolute z-50 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none',
          'bg-ink-strong text-white shadow-pop',
          placementClass,
        ]"
        role="tooltip"
      >
        {{ label }}
      </span>
    </Transition>
  </span>
</template>
