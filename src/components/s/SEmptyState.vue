<script setup lang="ts">
  import { computed } from 'vue'

  type Tone = 'neutral' | 'brand' | 'sun' | 'success' | 'violet'

  interface Props {
    title: string
    description?: string
    tone?: Tone
  }

  const { tone = 'brand' } = defineProps<Props>()

  const orbClass = computed(
    () =>
      ({
        neutral: 'from-slate-200/70 to-slate-100/40 dark:from-slate-500/20 dark:to-slate-500/0',
        brand: 'from-brand-500/25 to-violet-500/10 dark:from-brand-400/30 dark:to-violet-400/10',
        sun: 'from-orange-400/30 to-rose-400/15 dark:from-orange-400/30 dark:to-rose-400/10',
        success: 'from-emerald-400/30 to-teal-400/15 dark:from-emerald-400/25 dark:to-teal-400/10',
        violet:
          'from-violet-400/30 to-fuchsia-400/15 dark:from-violet-400/25 dark:to-fuchsia-400/10',
      })[tone]
  )

  const iconBgClass = computed(
    () =>
      ({
        neutral: 'bg-surface-canvas text-ink-muted border-line',
        brand:
          'bg-brand-50 text-brand-700 border-brand-100 dark:bg-brand-500/15 dark:text-brand-200 dark:border-brand-500/30',
        sun: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/15 dark:text-orange-200 dark:border-orange-500/30',
        success:
          'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30',
        violet:
          'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-500/30',
      })[tone]
  )
</script>

<template>
  <div class="relative flex flex-col items-center text-center py-14 px-6 overflow-hidden">
    <div
      :class="[
        'absolute -top-20 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-3xl opacity-70 pointer-events-none bg-gradient-to-br',
        orbClass,
      ]"
    />
    <div
      :class="[
        'relative h-12 w-12 rounded-xl border flex items-center justify-center mb-4 shadow-xs',
        iconBgClass,
      ]"
    >
      <slot name="icon" />
    </div>
    <h3 class="relative text-base font-semibold text-ink-strong">
      {{ title }}
    </h3>
    <p v-if="description" class="relative text-sm text-ink-muted mt-1.5 max-w-sm leading-relaxed">
      {{ description }}
    </p>
    <div v-if="$slots.actions" class="relative mt-5 flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
