<script setup lang="ts">
  import { computed } from 'vue'

  type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

  interface Props {
    name?: string
    src?: string
    size?: Size
    rounded?: 'full' | 'md'
  }

  const { name = '', src, size = 'md', rounded = 'full' } = defineProps<Props>()

  const initials = computed(() =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  )

  const sizeClass = computed(
    () =>
      ({
        xs: 'h-5 w-5 text-[9px]',
        sm: 'h-6 w-6 text-[10px]',
        md: 'h-8 w-8 text-xs',
        lg: 'h-10 w-10 text-sm',
        xl: 'h-14 w-14 text-base',
      })[size]
  )

  // Deterministic pastel-ish background colour from name
  const palette = [
    'bg-sky-500',
    'bg-violet-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-fuchsia-500',
  ]
  const colorClass = computed(
    () => palette[(name.charCodeAt(0) || 0) % palette.length] ?? 'bg-slate-500'
  )

  const radiusClass = computed(() => (rounded === 'md' ? 'rounded-md' : 'rounded-full'))
</script>

<template>
  <span
    :class="[
      'inline-flex items-center justify-center font-semibold text-white shrink-0 select-none overflow-hidden',
      sizeClass,
      radiusClass,
      !src && colorClass,
    ]"
    :title="name"
  >
    <img v-if="src" :src="src" :alt="name" class="h-full w-full object-cover" />
    <span v-else>{{ initials || '?' }}</span>
  </span>
</template>
