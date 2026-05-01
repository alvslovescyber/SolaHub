<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import type { Theme } from '@/stores/ui.store'

const { user, logout } = useAuth()
const { theme, setTheme } = useTheme()

const themes: { label: string; value: Theme }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
]
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <AppPageHeader title="Settings" subtitle="Manage your account and preferences" />

    <div class="flex-1 overflow-y-auto p-6 space-y-6 max-w-xl">
      <!-- Profile -->
      <AppCard>
        <div class="flex items-center gap-4">
          <AppAvatar v-if="user" :name="user.displayName" size="lg" />
          <div>
            <p class="font-semibold text-slate-900 dark:text-white">{{ user?.displayName }}</p>
            <p class="text-sm text-slate-500">{{ user?.email }}</p>
            <p class="text-xs text-slate-400 mt-0.5">Role: {{ user?.role }}</p>
          </div>
        </div>
      </AppCard>

      <!-- Appearance -->
      <AppCard>
        <p class="text-sm font-semibold text-slate-900 dark:text-white mb-3">Appearance</p>
        <div class="flex gap-2">
          <button
            v-for="t in themes"
            :key="t.value"
            :class="[
              'px-4 py-2 text-sm rounded-lg border transition-colors',
              theme === t.value
                ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
            ]"
            @click="setTheme(t.value)"
          >
            {{ t.label }}
          </button>
        </div>
      </AppCard>

      <!-- Danger zone -->
      <AppCard>
        <p class="text-sm font-semibold text-slate-900 dark:text-white mb-3">Account</p>
        <AppButton variant="danger" size="sm" @click="logout()">
          Sign out
        </AppButton>
      </AppCard>
    </div>
  </div>
</template>
