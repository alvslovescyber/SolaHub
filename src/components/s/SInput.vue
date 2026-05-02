<script setup lang="ts">
  import { computed, useId } from 'vue'
  import SLabel from './SLabel.vue'
  import SHelperText from './SHelperText.vue'

  type Size = 'sm' | 'md'

  interface Props {
    modelValue?: string | number
    label?: string
    placeholder?: string
    type?: string
    error?: string
    helper?: string
    disabled?: boolean
    readonly?: boolean
    required?: boolean
    autocomplete?: string
    inputmode?: 'text' | 'email' | 'numeric' | 'decimal' | 'search' | 'tel' | 'url'
    size?: Size
    id?: string
    autofocus?: boolean
    name?: string
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{
    'update:modelValue': [value: string]
    blur: [event: FocusEvent]
    focus: [event: FocusEvent]
  }>()

  const fallbackId = useId()
  const inputId = computed(() => props.id ?? fallbackId)
  const sizeClass = computed(() => (props.size === 'sm' ? 'h-8 text-sm' : 'h-9 text-sm'))
</script>

<template>
  <div class="flex flex-col">
    <SLabel v-if="label" :for="inputId" :required="required">
      {{ label }}
    </SLabel>
    <div class="relative">
      <span
        v-if="$slots.leading"
        class="absolute inset-y-0 left-0 flex items-center pl-2.5 text-ink-muted"
      >
        <slot name="leading" />
      </span>
      <input
        :id="inputId"
        :name="name"
        :value="modelValue"
        :type="type ?? 'text'"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :autofocus="autofocus"
        :class="[
          'w-full rounded-md border bg-surface-base px-3 text-ink-strong placeholder:text-ink-subtle',
          'transition-shadow duration-100',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'read-only:bg-surface-canvas',
          sizeClass,
          $slots.leading && 'pl-8',
          $slots.trailing && 'pr-8',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
            : 'border-line hover:border-line-strong',
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
      />
      <span
        v-if="$slots.trailing"
        class="absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink-muted"
      >
        <slot name="trailing" />
      </span>
    </div>
    <SHelperText v-if="error" error>
      {{ error }}
    </SHelperText>
    <SHelperText v-else-if="helper">
      {{ helper }}
    </SHelperText>
  </div>
</template>
