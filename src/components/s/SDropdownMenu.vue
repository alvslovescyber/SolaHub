<script setup lang="ts">
  import { ref, onMounted, onBeforeUnmount } from 'vue'

  interface Props {
    placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  }

  const { placement = 'bottom-start' } = defineProps<Props>()

  const open = ref(false)
  const root = ref<HTMLElement | null>(null)

  function toggle() {
    open.value = !open.value
  }
  function close() {
    open.value = false
  }
  function onClickOutside(event: MouseEvent) {
    if (open.value && root.value && !root.value.contains(event.target as Node)) close()
  }
  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') close()
  }

  onMounted(() => {
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onClickOutside)
    document.removeEventListener('keydown', onKey)
  })

  const placementClass = {
    'bottom-start': 'top-full left-0 mt-1.5',
    'bottom-end': 'top-full right-0 mt-1.5',
    'top-start': 'bottom-full left-0 mb-1.5',
    'top-end': 'bottom-full right-0 mb-1.5',
  }[placement]
</script>

<template>
  <div ref="root" class="relative inline-flex">
    <span @click="toggle">
      <slot name="trigger" :open="open" />
    </span>
    <Transition name="fade">
      <div
        v-if="open"
        :class="[
          'absolute z-dropdown min-w-[12rem] rounded-lg border border-line bg-surface-overlay shadow-pop',
          'p-1 text-sm backdrop-blur-xl',
          placementClass,
        ]"
        role="menu"
        @click="close"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition:
      opacity 120ms ease,
      transform 120ms ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
    transform: scale(0.97) translateY(-2px);
  }
</style>
