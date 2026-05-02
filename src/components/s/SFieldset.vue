<script setup lang="ts">
  interface Props {
    legend?: string
    description?: string
  }

  defineProps<Props>()
</script>

<template>
  <fieldset class="border-0 p-0 m-0">
    <legend v-if="legend" class="text-sm font-semibold text-ink-strong mb-1">
      {{ legend }}
    </legend>
    <p v-if="description" class="text-xs text-ink-muted mb-3">
      {{ description }}
    </p>
    <div class="space-y-3">
      <slot />
    </div>
  </fieldset>
</template>
