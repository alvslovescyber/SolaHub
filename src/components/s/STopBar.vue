<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { Bell } from 'lucide-vue-next'
  import { useUiStore } from '@/stores/ui.store'
  import { isMac } from '@/lib/platform'
  import SIconButton from './SIconButton.vue'
  import SNotificationPanel from './SNotificationPanel.vue'

  interface Props {
    title?: string
    subtitle?: string
    showBell?: boolean
  }

  const { showBell = true } = defineProps<Props>()
  const ui = useUiStore()
  const notifOpen = ref(false)

  const sidebarPad = computed(() =>
    isMac && ui.sidebarCollapsed ? 'pl-[var(--s-traffic-light-pad)]' : 'pl-4'
  )
</script>

<template>
  <header
    :class="[
      'topbar-chrome-pad min-h-[52px] py-2 shrink-0 flex items-center justify-between gap-3 pr-4 border-b border-line-subtle',
      'bg-surface-base/92 backdrop-blur-xl',
      sidebarPad,
    ]"
    data-tauri-drag-region
  >
    <div class="flex items-center min-w-0 gap-3">
      <div v-if="title || subtitle" class="min-w-0">
        <h1 v-if="title" class="text-[14px] font-semibold text-ink-strong truncate leading-snug">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-[12px] text-ink-muted truncate leading-snug mt-0.5">
          {{ subtitle }}
        </p>
      </div>
      <slot name="left" />
    </div>

    <div class="flex items-center gap-1.5" data-no-drag>
      <slot name="actions" />
      <SIconButton v-if="showBell" label="Notifications" size="sm" @click="notifOpen = !notifOpen">
        <Bell class="h-4 w-4" />
      </SIconButton>
    </div>
  </header>

  <SNotificationPanel :open="notifOpen" @close="notifOpen = false" />
</template>
