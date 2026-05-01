<script setup lang="ts">
  interface Props {
    name: string
    size?: 'sm' | 'md' | 'lg'
    src?: string
  }

  const { name, size = 'md', src } = defineProps<Props>()

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-base',
  }

  // Deterministic colour from name
  const colors = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-indigo-500',
  ]

  const colorClass = colors[name.charCodeAt(0) % colors.length]
</script>

<template>
  <div
    :class="[
      'rounded-full flex items-center justify-center font-semibold text-white shrink-0',
      sizeClasses[size],
      !src && colorClass,
    ]"
  >
    <img v-if="src" :src="src" :alt="name" class="rounded-full object-cover w-full h-full" />
    <span v-else>{{ initials }}</span>
  </div>
</template>
