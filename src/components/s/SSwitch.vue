<script setup lang="ts">
  import { computed, useId } from 'vue'

  interface Props {
    modelValue?: boolean
    label?: string
    description?: string
    disabled?: boolean
    id?: string
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

  const fallbackId = useId()
  const inputId = computed(() => props.id ?? fallbackId)

  function toggle() {
    if (!props.disabled) emit('update:modelValue', !props.modelValue)
  }
</script>

<template>
  <label :for="inputId" class="flex items-center gap-3 cursor-pointer select-none">
    <button
      :id="inputId"
      type="button"
      role="switch"
      :aria-checked="!!modelValue"
      :disabled="disabled"
      :class="[
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
        modelValue ? 'bg-brand-500' : 'bg-line-strong',
        disabled && 'opacity-50 cursor-not-allowed',
      ]"
      @click="toggle"
    >
      <span
        :class="[
          'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          modelValue ? 'translate-x-[18px]' : 'translate-x-0.5',
        ]"
      />
    </button>
    <span v-if="label || description" class="flex flex-col leading-tight">
      <span class="text-sm text-ink-strong">{{ label }}</span>
      <span v-if="description" class="text-xs text-ink-muted mt-0.5">{{ description }}</span>
    </span>
  </label>
</template>
