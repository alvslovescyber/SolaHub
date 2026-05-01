<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import AppSidebar from './AppSidebar.vue'
import AppContextPanel from './AppContextPanel.vue'

const auth = useAuthStore()

useKeyboardShortcuts()

onMounted(() => {
  // Listen for session expiry events emitted by the HTTP client
  window.addEventListener('auth:session-expired', () => auth.handleSessionExpired())
})
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
    <AppSidebar />

    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <AppContextPanel>
      <template #title>
        <slot name="context-title" />
      </template>
      <slot name="context" />
    </AppContextPanel>
  </div>
</template>
