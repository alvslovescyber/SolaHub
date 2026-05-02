<script setup lang="ts">
  import { computed } from 'vue'

  type Variant = 'raised' | 'flat' | 'quiet'
  type Padding = 'none' | 'sm' | 'md' | 'lg'

  interface Props {
    variant?: Variant
    padding?: Padding
    hoverable?: boolean
    as?: string
  }

  const { variant = 'raised', padding = 'md', hoverable = false, as = 'div' } = defineProps<Props>()

  const variantClass = computed(
    () => ({ raised: 's-card', flat: 's-card--flat', quiet: 's-card--quiet' })[variant]
  )

  const paddingClass = computed(() => ({ none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' })[padding])
</script>

<template>
  <component
    :is="as"
    :class="[
      variantClass,
      paddingClass,
      hoverable && 'transition-shadow duration-150 hover:shadow-pop cursor-pointer',
    ]"
  >
    <slot />
  </component>
</template>
