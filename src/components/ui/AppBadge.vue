<script setup lang="ts">
  interface Props {
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'gold'
    size?: 'sm' | 'md'
  }

  const { variant = 'default', size = 'md' } = defineProps<Props>()

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    gold: 'bg-gold-100 text-gold-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
  }
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium rounded-full',
      variantClasses[variant],
      sizeClasses[size],
    ]"
  >
    <slot />
  </span>
</template>
