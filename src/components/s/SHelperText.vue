<script setup lang="ts">
  interface Props {
    error?: boolean
  }

  defineProps<Props>()
</script>

<template>
  <p :class="['mt-1.5 text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-ink-muted']">
    <slot />
  </p>
</template>
