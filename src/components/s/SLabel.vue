<script setup lang="ts">
  interface Props {
    for?: string
    required?: boolean
    optional?: boolean
  }

  defineProps<Props>()
</script>

<template>
  <label
    :for="$props.for"
    class="block text-2xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5"
  >
    <slot />
    <span v-if="required" class="ml-1 text-red-500">*</span>
    <span v-if="optional" class="ml-1 text-ink-subtle font-normal normal-case tracking-normal">
      (optional)
    </span>
  </label>
</template>
