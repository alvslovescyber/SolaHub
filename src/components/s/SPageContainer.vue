<script setup lang="ts">
  interface Props {
    /** Constrain content width for forms and reading-oriented views. */
    max?: 'none' | 'md' | 'lg' | 'xl' | '2xl'
    padding?: 'none' | 'sm' | 'md' | 'lg'
  }

  const { max = 'none', padding = 'md' } = defineProps<Props>()

  const maxClass = {
    none: 'w-full',
    md: 'max-w-2xl',
    lg: 'max-w-3xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  }[max]
  const padClass = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }[padding]
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div :class="['mx-auto', maxClass, padClass]">
      <slot />
    </div>
  </div>
</template>
