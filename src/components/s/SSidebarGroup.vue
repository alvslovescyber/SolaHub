<script setup lang="ts">
  interface Props {
    label?: string
    collapsed?: boolean
  }

  defineProps<Props>()
</script>

<template>
  <div class="flex flex-col">
    <p
      v-if="label && !collapsed"
      class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-subtle"
    >
      {{ label }}
    </p>
    <div :class="['flex flex-col gap-0.5', collapsed ? 'px-2' : 'px-2']">
      <slot />
    </div>
  </div>
</template>
