<script setup lang="ts">
  import { computed } from 'vue'
  import { Bell, BellOff } from 'lucide-vue-next'
  import { useUiStore } from '@/stores/ui.store'
  import { isMac } from '@/lib/platform'
  import SIconButton from './SIconButton.vue'
  import SDropdownMenu from './SDropdownMenu.vue'

  interface Props {
    title?: string
    subtitle?: string
    showBell?: boolean
  }

  const { showBell = true } = defineProps<Props>()
  const ui = useUiStore()

  const sidebarPad = computed(() =>
    isMac && ui.sidebarCollapsed ? 'pl-[var(--s-traffic-light-pad)]' : 'pl-4'
  )
</script>

<template>
  <header
    :class="[
      'topbar-chrome-pad h-topbar shrink-0 flex items-center justify-between gap-3 pr-3 border-b border-line-subtle',
      'bg-surface-base/92 backdrop-blur-xl',
      sidebarPad,
    ]"
    data-tauri-drag-region
  >
    <div class="flex items-center min-w-0 gap-3">
      <div v-if="title || subtitle" class="min-w-0">
        <h1 v-if="title" class="text-[13px] font-medium text-ink-strong truncate leading-tight">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-[11px] text-ink-muted truncate leading-tight mt-0.5">
          {{ subtitle }}
        </p>
      </div>
      <slot name="left" />
    </div>

    <div class="flex items-center gap-1.5" data-no-drag>
      <slot name="actions" />
      <SDropdownMenu v-if="showBell" placement="bottom-end">
        <template #trigger>
          <SIconButton label="Notifications" size="sm">
            <Bell class="h-4 w-4" />
          </SIconButton>
        </template>
        <div class="w-72 px-3 py-3" @click.stop>
          <div class="flex items-center justify-between mb-2">
            <p class="text-[13px] font-semibold text-ink-strong">Notifications</p>
            <span class="text-[11px] text-ink-subtle">All caught up</span>
          </div>
          <div class="flex flex-col items-center text-center py-6 text-ink-muted">
            <span
              class="h-8 w-8 inline-flex items-center justify-center rounded-md bg-surface-canvas mb-2"
            >
              <BellOff class="h-4 w-4" />
            </span>
            <p class="text-[13px] text-ink-strong">You're all clear</p>
            <p class="text-xs mt-0.5 leading-relaxed">
              Mentions, prayer requests, and church updates will appear here.
            </p>
          </div>
        </div>
      </SDropdownMenu>
    </div>
  </header>
</template>
