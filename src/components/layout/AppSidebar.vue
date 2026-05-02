<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import {
    LayoutDashboard,
    BookOpen,
    CalendarDays,
    StickyNote,
    Monitor,
    Users,
    Settings,
    ChevronLeft,
    ChevronRight,
  } from 'lucide-vue-next'
  import { useUiStore } from '@/stores/ui.store'
  import { useAuthStore } from '@/stores/auth.store'
  import AppAvatar from '@/components/ui/AppAvatar.vue'

  const ui = useUiStore()
  const auth = useAuthStore()
  const route = useRoute()
  const router = useRouter()

  const navItems = computed(() => [
    { name: 'Dashboard', icon: LayoutDashboard, route: 'dashboard', section: 'dashboard' },
    { name: 'Bible', icon: BookOpen, route: 'bible', section: 'bible' },
    { name: 'Plans', icon: CalendarDays, route: 'plans', section: 'plans' },
    { name: 'Notations', icon: StickyNote, route: 'notes', section: 'notes' },
    ...(auth.isPresenter
      ? [{ name: 'Presenter', icon: Monitor, route: 'presenter', section: 'presenter' }]
      : []),
    { name: 'Community', icon: Users, route: 'community', section: 'community' },
  ])

  const isActive = (routeName: string) => route.name === routeName

  function navigate(routeName: string) {
    void router.push({ name: routeName })
  }
</script>

<template>
  <aside
    :class="[
      'sidebar-glass flex flex-col h-full transition-all duration-200 shrink-0 z-20',
      ui.sidebarCollapsed ? 'w-[60px]' : 'w-[220px]',
    ]"
  >
    <!-- Title bar drag region -->
    <div class="h-12 flex items-center px-4 shrink-0" data-tauri-drag-region>
      <div v-if="!ui.sidebarCollapsed" class="flex items-center gap-2">
        <div class="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center">
          <BookOpen class="h-4 w-4 text-white" />
        </div>
        <span class="font-bold text-sm text-slate-900 dark:text-white tracking-tight">SolaHub</span>
      </div>
      <div
        v-else
        class="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center mx-auto"
      >
        <BookOpen class="h-4 w-4 text-white" />
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
      <button
        v-for="item in navItems"
        :key="item.route"
        :title="ui.sidebarCollapsed ? item.name : undefined"
        :class="[
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
          'transition-colors duration-100',
          isActive(item.route)
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60',
          ui.sidebarCollapsed && 'justify-center',
        ]"
        @click="navigate(item.route)"
      >
        <component :is="item.icon" class="h-4 w-4 shrink-0" />
        <span v-if="!ui.sidebarCollapsed" class="truncate">{{ item.name }}</span>
      </button>
    </nav>

    <!-- Bottom: Settings + User + Collapse toggle -->
    <div class="px-2 pb-3 space-y-0.5 border-t border-slate-200/70 dark:border-slate-700/50 pt-2">
      <button
        :title="ui.sidebarCollapsed ? 'Settings' : undefined"
        :class="[
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
          'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60',
          'transition-colors duration-100',
          ui.sidebarCollapsed && 'justify-center',
        ]"
        @click="navigate('settings')"
      >
        <Settings class="h-4 w-4 shrink-0" />
        <span v-if="!ui.sidebarCollapsed">Settings</span>
      </button>

      <!-- User row -->
      <button
        v-if="auth.user"
        :class="[
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg',
          'hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors',
          ui.sidebarCollapsed && 'justify-center',
        ]"
        @click="navigate('settings')"
      >
        <AppAvatar :name="auth.user.displayName" size="sm" />
        <div v-if="!ui.sidebarCollapsed" class="text-left min-w-0">
          <p class="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {{ auth.user.displayName }}
          </p>
          <p class="text-[10px] text-slate-500 truncate">
            {{ auth.user.email }}
          </p>
        </div>
      </button>

      <!-- Collapse toggle -->
      <button
        class="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        :title="ui.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="ui.toggleSidebar()"
      >
        <ChevronLeft v-if="!ui.sidebarCollapsed" class="h-4 w-4" />
        <ChevronRight v-else class="h-4 w-4" />
      </button>
    </div>
  </aside>
</template>
