<script setup lang="ts">
  import { computed } from 'vue'

  type Variant = 'ghost' | 'subtle' | 'solid'
  type Size = 'xs' | 'sm' | 'md'

  interface Props {
    variant?: Variant
    size?: Size
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    label: string
  }

  const { variant = 'ghost', size = 'sm', disabled = false, type = 'button' } = defineProps<Props>()

  const variantClass = computed(
    () =>
      ({
        ghost:
          'text-ink-muted hover:text-ink-strong hover:bg-black/[0.05] dark:hover:bg-white/[0.06]',
        subtle: 'text-ink hover:text-ink-strong bg-surface-canvas hover:bg-surface-sunken',
        solid: 'text-white bg-brand-500 hover:bg-brand-600',
      })[variant]
  )

  const sizeClass = computed(() => ({ xs: 'h-6 w-6', sm: 'h-7 w-7', md: 'h-8 w-8' })[size])
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
    :class="[
      'inline-flex items-center justify-center rounded-md transition-colors duration-100 shrink-0',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variantClass,
      sizeClass,
    ]"
  >
    <slot />
  </button>
</template>
