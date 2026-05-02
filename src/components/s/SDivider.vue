<script setup lang="ts">
  interface Props {
    orientation?: 'horizontal' | 'vertical'
    label?: string
  }

  const { orientation = 'horizontal' } = defineProps<Props>()
</script>

<template>
  <div v-if="orientation === 'horizontal' && !label" class="h-px w-full bg-line" role="separator" />
  <div
    v-else-if="orientation === 'vertical'"
    class="w-px h-full bg-line shrink-0"
    role="separator"
  />
  <div v-else class="flex items-center gap-3">
    <div class="h-px flex-1 bg-line" />
    <span class="text-2xs uppercase tracking-wider text-ink-muted font-medium">{{ label }}</span>
    <div class="h-px flex-1 bg-line" />
  </div>
</template>
