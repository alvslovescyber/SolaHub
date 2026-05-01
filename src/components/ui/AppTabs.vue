<script setup lang="ts">
interface Tab {
  id: string
  label: string
  count?: number
}

interface Props {
  tabs: Tab[]
  modelValue: string
}

defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
</script>

<template>
  <div class="flex gap-1 border-b border-slate-200 dark:border-slate-700">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      :class="[
        'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors duration-100',
        modelValue === tab.id
          ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
      ]"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
      <span
        v-if="tab.count !== undefined"
        class="ml-1.5 text-xs bg-slate-100 dark:bg-slate-700 rounded-full px-1.5 py-0.5"
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>
