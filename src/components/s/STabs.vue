<script setup lang="ts">
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
  <div
    role="tablist"
    class="flex items-center gap-6"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.id"
      :disabled="tab.disabled"
      :class="[
        'relative inline-flex items-center gap-1.5 py-2.5 text-[13px] transition-colors',
        modelValue === tab.id
          ? 'text-brand-600 font-medium'
          : 'text-ink-muted hover:text-ink-strong',
        tab.disabled && 'opacity-50 cursor-not-allowed',
      ]"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
      <span
        v-if="tab.count !== undefined"
        :class="[
          'text-2xs px-1.5 h-4 inline-flex items-center justify-center rounded-full',
          modelValue === tab.id
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
            : 'bg-surface-canvas text-ink-muted',
        ]"
      >
        {{ tab.count }}
      </span>
      <span
        v-if="modelValue === tab.id"
        class="absolute -bottom-px left-0 right-0 h-[2px] bg-brand-500 rounded-full"
      />
    </button>
  </div>
</template>
