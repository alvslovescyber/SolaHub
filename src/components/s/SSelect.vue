<script setup lang="ts">
  import { computed, useId } from 'vue'
  import { ChevronDown } from 'lucide-vue-next'
  import SLabel from './SLabel.vue'
  import SHelperText from './SHelperText.vue'

  interface Option {
    label: string
    value: string | number
    disabled?: boolean
  }

  interface Props {
    modelValue?: string | number
    options: Option[]
    label?: string
    placeholder?: string
    error?: string
    helper?: string
    disabled?: boolean
    required?: boolean
    id?: string
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const fallbackId = useId()
  const selectId = computed(() => props.id ?? fallbackId)
</script>

<template>
  <div class="flex flex-col">
    <SLabel v-if="label" :for="selectId" :required="required">
      {{ label }}
    </SLabel>
    <div class="relative">
      <select
        :id="selectId"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="[
          'w-full appearance-none rounded-md border bg-surface-base pl-3 pr-9 h-9 text-sm text-ink-strong',
          'transition-shadow duration-100',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
            : 'border-line hover:border-line-strong',
        ]"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" disabled :selected="modelValue == null">
          {{ placeholder }}
        </option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value" :disabled="opt.disabled">
          {{ opt.label }}
        </option>
      </select>
      <ChevronDown
        class="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none"
      />
    </div>
    <SHelperText v-if="error" error>
      {{ error }}
    </SHelperText>
    <SHelperText v-else-if="helper">
      {{ helper }}
    </SHelperText>
  </div>
</template>
