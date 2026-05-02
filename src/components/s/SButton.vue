<script setup lang="ts">
  import { computed } from 'vue'
  import SSpinner from './SSpinner.vue'

  type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'link'
  type Size = 'xs' | 'sm' | 'md'

  interface Props {
    variant?: Variant
    size?: Size
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    fullWidth?: boolean
  }

  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    type = 'button',
    fullWidth = false,
  } = defineProps<Props>()

  const variantClass = computed(
    () =>
      ({
        primary:
          'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-xs disabled:bg-brand-300',
        secondary:
          'bg-white text-ink-strong border border-line hover:bg-surface-canvas active:bg-surface-sunken dark:bg-surface-raised dark:text-ink-strong dark:hover:bg-white/5',
        ghost:
          'bg-transparent text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.07]',
        subtle:
          'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/20',
        danger:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-xs disabled:bg-red-300',
        link: 'bg-transparent text-brand-600 hover:underline underline-offset-4 dark:text-brand-300 px-0 py-0 h-auto',
      })[variant]
  )

  const sizeClass = computed(
    () =>
      ({
        xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
        sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
        md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
      })[size]
  )
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
      'transition-colors duration-100',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-base',
      'disabled:cursor-not-allowed disabled:opacity-60',
      variantClass,
      sizeClass,
      fullWidth && 'w-full',
    ]"
  >
    <SSpinner
      v-if="loading"
      :size="size === 'xs' ? 'xs' : 'sm'"
    />
    <slot
      v-else
      name="leading"
    />
    <slot />
    <slot name="trailing" />
  </button>
</template>
