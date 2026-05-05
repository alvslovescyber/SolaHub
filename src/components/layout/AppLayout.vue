<script setup lang="ts">
  import { RouterView } from 'vue-router'
  import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
  import AppSidebar from './AppSidebar.vue'
  import AppContextPanel from './AppContextPanel.vue'

  useKeyboardShortcuts()
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
