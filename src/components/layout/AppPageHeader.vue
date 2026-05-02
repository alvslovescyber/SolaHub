<script setup lang="ts">
  interface Props {
    title: string
    subtitle?: string
  }

  defineProps<Props>()
</script>

<template>
  <header
    class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0"
  >
    <div>
      <h1 class="text-lg font-bold text-slate-900 dark:text-white">
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="text-sm text-slate-500 mt-0.5"
      >
        {{ subtitle }}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
