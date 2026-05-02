<script setup lang="ts">
  import type { LucideIcon } from 'lucide-vue-next'
  import { useRoute, useRouter } from 'vue-router'

  export interface SettingsLink {
    id: string
    label: string
    icon?: LucideIcon
    routeName?: string
  }

  interface Props {
    sections: { label?: string; items: SettingsLink[] }[]
    activeId: string
  }

  defineProps<Props>()
  const emit = defineEmits<{ 'update:activeId': [id: string] }>()

  const router = useRouter()
  const route = useRoute()

  function activate(item: SettingsLink) {
    emit('update:activeId', item.id)
    if (item.routeName && item.routeName !== route.name) {
      void router.push({ name: item.routeName })
    }
  }
</script>

<template>
  <nav class="w-[200px] shrink-0 border-r border-line-subtle py-4 px-2 flex flex-col gap-3">
    <div
      v-for="(section, index) in sections"
      :key="index"
      class="flex flex-col"
    >
      <p
        v-if="section.label"
        class="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-ink-subtle"
      >
        {{ section.label }}
      </p>
      <div class="flex flex-col gap-0.5">
        <button
          v-for="item in section.items"
          :key="item.id"
          type="button"
          :class="[
            'flex items-center gap-2 h-7 px-2 rounded-md text-sm transition-colors w-full text-left',
            activeId === item.id
              ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 font-medium'
              : 'text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
          ]"
          @click="activate(item)"
        >
          <component
            :is="item.icon"
            v-if="item.icon"
            class="h-3.5 w-3.5 shrink-0"
          />
          {{ item.label }}
        </button>
      </div>
    </div>
  </nav>
</template>
