<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const { size = 'md', label = 'Loading...' } = defineProps<Props>()

const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }
</script>

<template>
  <div role="status" class="flex items-center gap-2">
    <svg
      :class="['animate-spin text-primary-600', sizeClasses[size]]"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
    <span class="sr-only">{{ label }}</span>
  </div>
</template>
