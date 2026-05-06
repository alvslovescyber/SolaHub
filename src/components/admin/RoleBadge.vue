<script setup lang="ts">
  import { computed } from 'vue'

  const props = withDefaults(
    defineProps<{
      role?: string
    }>(),
    {
      role: 'Member',
    }
  )

  const colors: Record<string, string> = {
    Admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Pastor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Presenter: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Member: 'bg-muted text-muted-foreground',
  }

  const colorClass = computed(() => colors[props.role] ?? colors.Member)
</script>

<template>
  <span :class="['inline-flex px-2 py-0.5 rounded-full text-xs font-medium', colorClass]">
    {{ role }}
  </span>
</template>
