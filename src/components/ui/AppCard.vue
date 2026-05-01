<script setup lang="ts">
interface Props {
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const { hoverable = false, padding = 'md' } = defineProps<Props>()

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}
</script>

<template>
  <div
    :class="[
      'card',
      paddingClasses[padding],
      hoverable && 'cursor-pointer hover:shadow-md transition-shadow',
    ]"
  >
    <slot />
  </div>
</template>
