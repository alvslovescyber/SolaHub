<script setup lang="ts">
  import { computed } from 'vue'
  import { X } from 'lucide-vue-next'

  type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'sun'

  interface Props {
    tone?: Tone
    removable?: boolean
  }

  const { tone = 'neutral' } = defineProps<Props>()
  const emit = defineEmits<{ remove: [] }>()

  const toneClass = computed(
    () =>
      ({
        neutral: 'bg-surface-canvas text-ink border border-line',
        brand:
          'bg-brand-50 text-brand-700 border border-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/30',
        success:
          'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
        warning:
          'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
        danger:
          'bg-red-50 text-red-700 border border-red-100 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
        sun: 'bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
      })[tone]
  )
</script>

<template>
  <span
    :class="['inline-flex items-center gap-1 px-2 h-5 text-xs font-medium rounded-full', toneClass]"
  >
    <slot />
    <button
      v-if="removable"
      type="button"
      class="hover:opacity-70"
      :aria-label="'Remove'"
      @click="emit('remove')"
    >
      <X class="h-3 w-3" />
    </button>
  </span>
</template>
