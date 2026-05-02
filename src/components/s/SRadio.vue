<script setup lang="ts">
  import { computed, useId } from 'vue'

  interface Props {
    modelValue?: string | number | boolean
    value: string | number | boolean
    name: string
    label?: string
    description?: string
    disabled?: boolean
    id?: string
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{ 'update:modelValue': [value: string | number | boolean] }>()

  const fallbackId = useId()
  const inputId = computed(() => props.id ?? fallbackId)
  const checked = computed(() => props.modelValue === props.value)
</script>

<template>
  <label :for="inputId" class="flex items-start gap-2.5 cursor-pointer select-none">
    <span class="relative inline-flex shrink-0 mt-0.5">
      <input
        :id="inputId"
        type="radio"
        :name="name"
        :checked="checked"
        :disabled="disabled"
        class="peer sr-only"
        @change="emit('update:modelValue', value)"
      />
      <span
        :class="[
          'inline-flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
          'border-line peer-hover:border-line-strong peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40',
          checked && 'border-brand-500',
          disabled && 'opacity-50',
        ]"
      >
        <span v-if="checked" class="h-2 w-2 rounded-full bg-brand-500" />
      </span>
    </span>
    <span v-if="label || description" class="flex flex-col leading-tight">
      <span class="text-sm text-ink-strong">{{ label }}</span>
      <span v-if="description" class="text-xs text-ink-muted mt-0.5">{{ description }}</span>
    </span>
  </label>
</template>
