<script setup lang="ts">
  import { computed, useId } from 'vue'
  import SLabel from './SLabel.vue'
  import SHelperText from './SHelperText.vue'

  interface Props {
    modelValue?: string
    label?: string
    placeholder?: string
    rows?: number
    error?: string
    helper?: string
    disabled?: boolean
    required?: boolean
    id?: string
    autoresize?: boolean
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const fallbackId = useId()
  const textareaId = computed(() => props.id ?? fallbackId)

  function onInput(event: Event) {
    const el = event.target as HTMLTextAreaElement
    if (props.autoresize) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    emit('update:modelValue', el.value)
  }
</script>

<template>
  <div class="flex flex-col">
    <SLabel
      v-if="label"
      :for="textareaId"
      :required="required"
    >
      {{ label }}
    </SLabel>
    <textarea
      :id="textareaId"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows ?? 3"
      :disabled="disabled"
      :required="required"
      :class="[
        'w-full rounded-md border bg-surface-base px-3 py-2 text-sm text-ink-strong placeholder:text-ink-subtle',
        'transition-shadow duration-100 resize-y',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
          : 'border-line hover:border-line-strong',
      ]"
      @input="onInput"
    />
    <SHelperText
      v-if="error"
      error
    >
      {{ error }}
    </SHelperText>
    <SHelperText v-else-if="helper">
      {{ helper }}
    </SHelperText>
  </div>
</template>
