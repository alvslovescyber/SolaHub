<script setup lang="ts">
  interface Props {
    keys: string | string[]
  }

  const props = defineProps<Props>()
  const list = Array.isArray(props.keys) ? props.keys : props.keys.split('+')
</script>

<template>
  <span class="inline-flex items-center gap-0.5 text-2xs font-medium text-ink-muted">
    <kbd
      v-for="(k, i) in list"
      :key="i"
      class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-line bg-surface-canvas text-ink-muted font-sans"
    >
      {{ k }}
    </kbd>
  </span>
</template>
