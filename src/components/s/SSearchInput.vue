<script setup lang="ts">
  import { Search } from 'lucide-vue-next'
  import SKbd from './SKbd.vue'
  import { modKeyLabel } from '@/lib/platform'

  interface Props {
    placeholder?: string
    showShortcut?: boolean
  }

  const { placeholder = 'Search', showShortcut = true } = defineProps<Props>()
  const emit = defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    type="button"
    data-no-drag
    :class="[
      'group flex items-center gap-2 h-7 w-full px-2 rounded-md',
      'bg-black/[0.04] hover:bg-black/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.08]',
      'text-ink-muted text-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
    ]"
    @click="(e) => emit('click', e)"
  >
    <Search class="h-3.5 w-3.5 shrink-0" />
    <span class="flex-1 text-left truncate">{{ placeholder }}</span>
    <SKbd v-if="showShortcut" :keys="[modKeyLabel, 'K']" />
  </button>
</template>
