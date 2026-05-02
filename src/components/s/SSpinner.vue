<script setup lang="ts">
  import { computed } from 'vue'

  type Size = 'xs' | 'sm' | 'md' | 'lg'

  interface Props {
    size?: Size
    label?: string
  }

  const { size = 'md', label = 'Loading' } = defineProps<Props>()

  const sizeClass = computed(
    () => ({ xs: 'h-3 w-3', sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-8 w-8' })[size]
  )
</script>

<template>
  <span :class="['inline-flex items-center justify-center', sizeClass]" role="status">
    <svg viewBox="0 0 24 24" fill="none" class="h-full w-full animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" class="opacity-25" />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </svg>
    <span class="sr-only">{{ label }}</span>
  </span>
</template>
