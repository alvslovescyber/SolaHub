<script setup lang="ts">
  interface Props {
    danger?: boolean
    disabled?: boolean
    as?: string
    to?: object | string
  }

  const { danger = false, disabled = false, as = 'button', to } = defineProps<Props>()
  const tag = to ? 'router-link' : as
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :type="tag === 'button' ? 'button' : undefined"
    :disabled="disabled"
    role="menuitem"
    :class="[
      'flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors',
      danger
        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/15'
        : 'text-ink hover:bg-surface-canvas hover:text-ink-strong',
      disabled && 'opacity-50 cursor-not-allowed',
    ]"
  >
    <slot name="leading" />
    <slot />
    <span
      v-if="$slots.shortcut"
      class="ml-auto text-2xs text-ink-subtle"
    >
      <slot name="shortcut" />
    </span>
  </component>
</template>
