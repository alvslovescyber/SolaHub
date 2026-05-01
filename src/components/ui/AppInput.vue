<script setup lang="ts">
interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  type?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-if="label"
      class="text-sm font-medium text-slate-700 dark:text-slate-300"
    >
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </label>

    <input
      :value="modelValue"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[
        'w-full px-3 py-2 text-sm rounded-lg border',
        'bg-white dark:bg-slate-800',
        'text-slate-900 dark:text-slate-100',
        'placeholder-slate-400 dark:placeholder-slate-500',
        'transition-colors duration-100',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        error
          ? 'border-red-400 dark:border-red-500'
          : 'border-slate-200 dark:border-slate-700',
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
