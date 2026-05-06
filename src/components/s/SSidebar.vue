<script setup lang="ts">
  import { computed, ref } from 'vue'
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
    ShieldCheck,
    StickyNote,
    Users,
  } from 'lucide-vue-next'
  import { useUiStore } from '@/stores/ui.store'
  import { useAuthStore } from '@/stores/auth.store'
  import { usePlansStore } from '@/stores/plans.store'
  import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
  import { isMac, modKeyLabel } from '@/lib/platform'
  import SSidebarGroup from './SSidebarGroup.vue'
  import SSidebarItem from './SSidebarItem.vue'
  import SSidebarUserChip from './SSidebarUserChip.vue'
  import SSearchInput from './SSearchInput.vue'
  import SBrandMark from './SBrandMark.vue'
  import SIconButton from './SIconButton.vue'
  import SNotificationPanel from './SNotificationPanel.vue'
  import STooltip from './STooltip.vue'
  import SUpdateButton from './SUpdateButton.vue'

  const ui = useUiStore()
  const auth = useAuthStore()
  const plans = usePlansStore()
  const { rememberUserToggle } = useResponsiveLayout()

  const activePlansCount = computed(() =>
    plans.activePlans.length > 0 ? plans.activePlans.length : undefined
  )

  const collapsed = computed(() => ui.sidebarCollapsed)
  const notifOpen = ref(false)
  const notifAnchor = ref<NotificationAnchorRect | null>(null)

  const searchKbd = computed(() => (isMac ? `${modKeyLabel} K` : `${modKeyLabel}+K`))

  interface NotificationAnchorRect {
    top: number
    right: number
    bottom: number
    left: number
    width: number
    height: number
  }

  function readAnchorRect(target: EventTarget | null): NotificationAnchorRect | null {
    if (!(target instanceof HTMLElement)) return null
    const rect = target.getBoundingClientRect()
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    }
  }

  function toggleNotifications(event: MouseEvent): void {
    notifAnchor.value = readAnchorRect(event.currentTarget)
    notifOpen.value = !notifOpen.value
  }

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
        <!-- ── Expanded mode header ── -->
        <template v-if="!collapsed">
          <RouterLink
            :to="{ name: 'dashboard' }"
            class="flex items-center gap-2 min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            aria-label="Home"
          >
            <SBrandMark :size="20" />
            <span
              class="text-[13px] font-medium font-sans text-ink-strong tracking-tight select-none truncate"
              >SolaHub</span
            >
          </RouterLink>

          <!-- Notification bell -->
          <SIconButton
            label="Notifications"
            size="sm"
            class="shrink-0"
            data-no-drag
            @click="toggleNotifications"
          >
            <Bell class="h-[14px] w-[14px]" />
          </SIconButton>

          <!-- Collapse button -->
          <button
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
            <ChevronsLeft class="h-[15px] w-[15px]" stroke-width="2" />
          </button>
        </template>

        <!-- ── Collapsed mode header ── -->
        <template v-else>
          <RouterLink
            :to="{ name: 'dashboard' }"
            data-no-drag
            class="flex items-center justify-center rounded-md p-0 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-500/40"
            aria-label="Home"
          >
            <SBrandMark :size="22" />
          </RouterLink>

          <!-- Notification bell collapsed -->
          <STooltip label="Notifications" placement="right" data-no-drag>
            <button
              type="button"
              :class="[
                'flex items-center justify-center rounded-md text-ink-muted transition-colors',
                'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-ink-strong',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                'h-8 w-8',
              ]"
              @click="toggleNotifications"
            >
              <Bell class="h-4 w-4" stroke-width="2" />
            </button>
          </STooltip>

          <!-- Expand button -->
          <button
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
            <ChevronsRight class="h-[15px] w-[15px]" stroke-width="2" />
          </button>
        </template>
      </div>

      <div v-if="!collapsed" class="px-2 pb-2" data-no-drag>
        <SSearchInput @click="openPalette" />
      </div>
      <div v-else class="flex justify-center px-0" data-no-drag>
        <SIconButton size="sm" :label="`Search (${searchKbd})`" @click="openPalette">
          <Search class="h-4 w-4" stroke-width="2" />
        </SIconButton>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto pb-2 min-h-0 flex flex-col gap-1" data-no-drag>
      <SSidebarGroup label="Study" :collapsed="collapsed">
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
      </SSidebarGroup>

      <SSidebarGroup label="Scripture" :collapsed="collapsed">
        <SSidebarItem :icon="BookOpen" label="Bible" route-name="bible" :collapsed="collapsed" />
        <SSidebarItem
          :icon="ListChecks"
          label="Plans"
          route-name="plans"
          :collapsed="collapsed"
          :badge="activePlansCount"
        />
      </SSidebarGroup>

      <SSidebarGroup label="Sunday" :collapsed="collapsed">
        <SSidebarItem
          :icon="StickyNote"
          label="Notations"
          route-name="notes"
          :collapsed="collapsed"
        />
        <SSidebarItem
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

      <SSidebarGroup v-if="auth.isAdmin" label="Admin" :collapsed="collapsed">
        <SSidebarItem
          :icon="ShieldCheck"
          label="Admin Panel"
          route-name="admin"
          :collapsed="collapsed"
        />
      </SSidebarGroup>
    </nav>

    <!-- Profile footer — no border, blends naturally with vibrancy -->
    <div
      :class="[
        'mt-auto',
        collapsed ? 'flex flex-col items-center py-2 px-1' : 'flex flex-col py-2',
      ]"
      data-no-drag
    >
      <div v-if="!collapsed" class="px-3 pb-2">
        <SUpdateButton full-width />
      </div>
      <div v-else class="pb-2">
        <SUpdateButton collapsed />
      </div>
      <SSidebarUserChip
        v-if="auth.user"
        :name="auth.user.displayName"
        :subtitle="auth.user.email"
        :collapsed="collapsed"
        @logout="handleLogout"
      />
    </div>
  </aside>

  <SNotificationPanel :open="notifOpen" :anchor-rect="notifAnchor" @close="notifOpen = false" />
</template>
