<script setup lang="ts">
  import { computed } from 'vue'
  import { RouterLink } from 'vue-router'
  import {
    Bell,
    BookOpen,
    CalendarDays,
    ChevronsLeft,
    ChevronsRight,
    Home,
    ListChecks,
    Monitor,
    Search,
    StickyNote,
    Users,
  } from 'lucide-vue-next'
  import { useUiStore } from '@/stores/ui.store'
  import { useAuthStore } from '@/stores/auth.store'
  import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
  import { isMac, modKeyLabel } from '@/lib/platform'
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

  const searchKbd = computed(() => (isMac ? `${modKeyLabel} K` : `${modKeyLabel}+K`))

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
    <div
      :class="['sidebar-chrome-pad flex flex-col shrink-0', collapsed ? 'gap-1 pb-2 px-1' : '']"
      data-tauri-drag-region
    >
      <div
        :class="[
          'flex items-center pb-2',
          collapsed ? 'flex-col justify-center gap-1 px-0' : 'gap-2 px-2.5 min-h-[28px]',
        ]"
      >
        <RouterLink
          v-if="!collapsed"
          :to="{ name: 'dashboard' }"
          class="flex items-center gap-2 min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          aria-label="Home"
        >
          <SBrandMark :size="20" />
          <span class="text-[13px] font-medium text-ink-strong tracking-tight select-none truncate">SolaHub</span>
        </RouterLink>
        <RouterLink
          v-else
          :to="{ name: 'dashboard' }"
          data-no-drag
          class="flex items-center justify-center rounded-md p-0 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-500/40"
          aria-label="Home"
        >
          <SBrandMark :size="22" />
        </RouterLink>
        <button
          v-if="collapsed"
          type="button"
          data-no-drag
          :class="[
            'flex items-center justify-center rounded-md text-ink-muted transition-colors shrink-0',
            'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-ink-strong',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
            'h-8 w-8',
          ]"
          title="Expand sidebar"
          aria-label="Expand sidebar"
          @click="toggleSidebar"
        >
          <ChevronsRight
            class="h-[15px] w-[15px]"
            stroke-width="2"
          />
        </button>
        <button
          v-if="!collapsed"
          type="button"
          data-no-drag
          :class="[
            'flex items-center justify-center rounded-md text-ink-muted transition-colors shrink-0',
            'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-ink-strong',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
            'h-8 w-8 ml-auto',
          ]"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          @click="toggleSidebar"
        >
          <ChevronsLeft
            class="h-[15px] w-[15px]"
            stroke-width="2"
          />
        </button>
      </div>
      <div
        v-if="!collapsed"
        class="px-2 pb-2"
        data-no-drag
      >
        <SSearchInput @click="openPalette" />
      </div>
      <div
        v-else
        class="flex justify-center px-0"
        data-no-drag
      >
        <SIconButton
          size="sm"
          :label="`Search (${searchKbd})`"
          @click="openPalette"
        >
          <Search
            class="h-4 w-4"
            stroke-width="2"
          />
        </SIconButton>
      </div>
    </div>

    <nav
      class="flex-1 overflow-y-auto pb-2 min-h-0 flex flex-col gap-1"
      data-no-drag
    >
      <SSidebarGroup
        label="Study"
        :collapsed="collapsed"
      >
        <SSidebarItem
          :icon="Home"
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
        <SSidebarItem
          :icon="Bell"
          label="Inbox"
          route-name="inbox"
          :collapsed="collapsed"
        />
      </SSidebarGroup>

      <SSidebarGroup
        label="Scripture"
        :collapsed="collapsed"
      >
        <SSidebarItem
          :icon="BookOpen"
          label="Bible"
          route-name="bible"
          :collapsed="collapsed"
        />
        <SSidebarItem
          :icon="ListChecks"
          label="Plans"
          route-name="plans"
          :collapsed="collapsed"
        />
        <SSidebarItem
          :icon="StickyNote"
          label="Notes"
          route-name="notes"
          :collapsed="collapsed"
        />
      </SSidebarGroup>

      <SSidebarGroup
        label="Sunday"
        :collapsed="collapsed"
      >
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

    <div
      :class="[
        'mt-auto border-t border-line-subtle',
        collapsed ? 'flex flex-col items-center py-2 px-1' : 'flex flex-col py-2',
      ]"
      data-no-drag
    >
      <SSidebarUserChip
        v-if="auth.user"
        :name="auth.user.displayName"
        :subtitle="auth.user.email"
        :collapsed="collapsed"
        @logout="handleLogout"
      />
    </div>
  </aside>
</template>
