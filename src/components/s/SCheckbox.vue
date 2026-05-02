<script setup lang="ts">
  import { computed, useId } from 'vue'
  import { Check } from 'lucide-vue-next'

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
</script>

<template>
  <label :for="inputId" class="flex items-start gap-2.5 cursor-pointer select-none group">
    <span class="relative inline-flex shrink-0 mt-0.5">
      <input
        :id="inputId"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        class="peer sr-only"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span
        :class="[
          'inline-flex h-4 w-4 items-center justify-center rounded border transition-colors',
          'border-line peer-hover:border-line-strong peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40',
          'peer-checked:bg-brand-500 peer-checked:border-brand-500',
          disabled && 'opacity-50',
        ]"
      >
        <Check v-if="modelValue" class="h-3 w-3 text-white" :stroke-width="3" />
      </span>
    </span>
    <span v-if="label || description" class="flex flex-col leading-tight">
      <span class="text-sm text-ink-strong">{{ label }}</span>
      <span v-if="description" class="text-xs text-ink-muted mt-0.5">{{ description }}</span>
    </span>
  </label>
</template>
