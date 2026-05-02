<script setup lang="ts">
  import { computed } from 'vue'
  import SAvatar from './SAvatar.vue'

  interface Item {
    name: string
    src?: string
  }

  interface Props {
    items: Item[]
    max?: number
    size?: 'xs' | 'sm' | 'md' | 'lg'
  }

  const { items, max = 4, size = 'sm' } = defineProps<Props>()

  const visible = computed(() => items.slice(0, max))
  const overflow = computed(() => Math.max(0, items.length - max))
</script>

<template>
  <div class="flex items-center -space-x-1.5">
    <span
      v-for="(item, index) in visible"
      :key="index"
      class="ring-2 ring-surface-base rounded-full"
    >
      <SAvatar
        :name="item.name"
        :src="item.src"
        :size="size"
      />
    </span>
    <span
      v-if="overflow > 0"
      class="ring-2 ring-surface-base rounded-full inline-flex items-center justify-center bg-surface-canvas text-ink-muted text-2xs font-semibold h-6 w-6"
    >
      +{{ overflow }}
    </span>
  </div>
</template>
