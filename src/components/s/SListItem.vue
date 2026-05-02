<script setup lang="ts">
  interface Props {
    selected?: boolean
    as?: string
    to?: object | string
  }

  const { selected = false, as = 'div', to } = defineProps<Props>()
  const tag = to ? 'router-link' : as
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :class="[
      'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm',
      selected ? 'bg-surface-canvas text-ink-strong' : 'text-ink hover:bg-surface-canvas',
    ]"
  >
    <slot name="leading" />
    <div class="flex-1 min-w-0">
      <slot />
    </div>
    <slot name="trailing" />
  </component>
</template>
