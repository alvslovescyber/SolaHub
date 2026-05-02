<script setup lang="ts">
  import STabs from './STabs.vue'

  interface Tab {
    id: string
    label: string
    count?: number
    disabled?: boolean
  }

  interface Props {
    tabs: Tab[]
    modelValue: string
  }

  defineProps<Props>()
  const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
</script>

<template>
  <div class="px-5 shrink-0 border-b border-line">
    <STabs
      :tabs="tabs"
      :model-value="modelValue"
      @update:model-value="(v) => emit('update:modelValue', v)"
    />
  </div>
</template>
