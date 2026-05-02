<script setup lang="ts">
  import { computed } from 'vue'
  import {
    LayoutDashboard,
    CalendarDays,
    Inbox,
    BookOpenText,
    StickyNote,
    Users,
    Monitor,
    Settings,
    PanelLeftClose,
    PanelLeftOpen,
  } from 'lucide-vue-next'
  import { useUiStore } from '@/stores/ui.store'
  import { useAuthStore } from '@/stores/auth.store'
  import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
  import { isMac } from '@/lib/platform'
  import SSidebarGroup from './SSidebarGroup.vue'
  import SSidebarItem from './SSidebarItem.vue'
  import SSidebarUserChip from './SSidebarUserChip.vue'
  import SSearchInput from './SSearchInput.vue'
  import SBrandMark from './SBrandMark.vue'
  import SIconButton from './SIconButton.vue'

  const ui = useUiStore()
  const auth = useAuthStore()
  const { rememberUserToggle } = useResponsiveLayout()

  const collapsed = computed(() => ui.sidebarCollapsed)

  function openPalette() {
    ui.openCommandPalette()
  }

  function toggleSidebar() {
    rememberUserToggle()
    ui.toggleSidebar()
  }

  async function handleLogout() {
    await auth.logout()
  }
</script>

<template>
  <aside
    :class="[
      's-vibrancy-sidebar flex flex-col h-full shrink-0 z-20 border-r border-line-subtle',
      'transition-[width] duration-200',
      collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
    ]"
    data-tauri-drag-region
  >
    <!-- Top: traffic-light spacer + brand + search -->
    <div :class="['flex flex-col shrink-0', isMac ? 'pt-[36px]' : 'pt-2']" data-tauri-drag-region>
      <div :class="['flex items-center gap-2 px-2.5 pb-2', collapsed && 'justify-center px-0']">
        <SBrandMark :size="20" />
        <span v-if="!collapsed" class="text-[13px] font-semibold text-ink-strong tracking-tight"
          >SolaHub</span
        >
      </div>
      <div v-if="!collapsed" class="px-2 pb-2" data-no-drag>
        <SSearchInput @click="openPalette" />
      </div>
      <div v-else class="px-2 pb-2 flex justify-center" data-no-drag>
        <SIconButton size="sm" label="Search" @click="openPalette">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" stroke-linecap="round" />
          </svg>
        </SIconButton>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto pb-2" data-no-drag>
      <SSidebarGroup label="Study" :collapsed="collapsed">
        <SSidebarItem
          :icon="LayoutDashboard"
          label="Dashboard"
          route-name="dashboard"
          :collapsed="collapsed"
        />
        <SSidebarItem
          :icon="CalendarDays"
          label="Calendar"
          route-name="calendar"
          :collapsed="collapsed"
        />
        <SSidebarItem :icon="Inbox" label="Inbox" route-name="inbox" :collapsed="collapsed" />
      </SSidebarGroup>

      <SSidebarGroup label="Scripture" :collapsed="collapsed">
        <SSidebarItem
          :icon="BookOpenText"
          label="Bible"
          route-name="bible"
          :collapsed="collapsed"
        />
        <SSidebarItem
          :icon="CalendarDays"
          label="Plans"
          route-name="plans"
          :collapsed="collapsed"
        />
        <SSidebarItem :icon="StickyNote" label="Notes" route-name="notes" :collapsed="collapsed" />
      </SSidebarGroup>

      <SSidebarGroup label="Sunday" :collapsed="collapsed">
        <SSidebarItem
          v-if="auth.isPresenter"
          :icon="Monitor"
          label="Presenter"
          route-name="presenter"
          :collapsed="collapsed"
        />
        <SSidebarItem
          :icon="Users"
          label="Community"
          route-name="community"
          :collapsed="collapsed"
        />
      </SSidebarGroup>
    </nav>

    <!-- Bottom: settings + user + collapse toggle -->
    <div class="px-2 pb-2 pt-1.5 border-t border-line-subtle space-y-1" data-no-drag>
      <SSidebarItem
        :icon="Settings"
        label="Settings"
        route-name="settings"
        :collapsed="collapsed"
      />
      <SSidebarUserChip
        v-if="auth.user"
        :name="auth.user.displayName"
        :subtitle="auth.user.email"
        :collapsed="collapsed"
        @logout="handleLogout"
      />
      <button
        type="button"
        :class="[
          'flex items-center justify-center w-full h-7 rounded-md text-ink-muted',
          'hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors',
        ]"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleSidebar"
      >
        <PanelLeftClose v-if="!collapsed" class="h-4 w-4" />
        <PanelLeftOpen v-else class="h-4 w-4" />
      </button>
    </div>
  </aside>
</template>
