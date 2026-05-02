<script setup lang="ts">
  import { computed } from 'vue'

  type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'sun' | 'violet'
  type Variant = 'soft' | 'solid' | 'outline'

  interface Props {
    tone?: Tone
    variant?: Variant
    dot?: boolean
  }

  const { tone = 'neutral', variant = 'soft', dot = false } = defineProps<Props>()

  const toneClass = computed(() => {
    if (variant === 'solid') {
      return {
        neutral: 'bg-ink-strong text-white',
        brand: 'bg-brand-500 text-white',
        success: 'bg-emerald-500 text-white',
        warning: 'bg-amber-500 text-white',
        danger: 'bg-red-500 text-white',
        sun: 'bg-orange-500 text-white',
        violet: 'bg-violet-500 text-white',
      }[tone]
    }
    if (variant === 'outline') {
      return {
        neutral: 'border border-line text-ink',
        brand: 'border border-brand-300 text-brand-700 dark:text-brand-300',
        success: 'border border-emerald-300 text-emerald-700 dark:text-emerald-300',
        warning: 'border border-amber-300 text-amber-700 dark:text-amber-300',
        danger: 'border border-red-300 text-red-700 dark:text-red-300',
        sun: 'border border-orange-300 text-orange-700 dark:text-orange-300',
        violet: 'border border-violet-300 text-violet-700 dark:text-violet-300',
      }[tone]
    }
    return {
      neutral: 'bg-surface-canvas text-ink border border-line',
      brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
      success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
      sun: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
      violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    }[tone]
  })

  const dotClass = computed(
    () =>
      ({
        neutral: 'bg-ink',
        brand: 'bg-brand-500',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        sun: 'bg-orange-500',
        violet: 'bg-violet-500',
      })[tone]
  )
</script>

<template>
  <span
    :class="['inline-flex items-center gap-1.5 px-2 h-5 text-xs font-medium rounded', toneClass]"
  >
    <span v-if="dot" :class="['h-1.5 w-1.5 rounded-full', dotClass]" />
    <slot />
  </span>
</template>
