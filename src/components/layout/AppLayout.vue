<script setup lang="ts">
  import { RouterView } from 'vue-router'
  import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
  import { isTauri, isWindows } from '@/lib/platform'
  import AppSidebar from './AppSidebar.vue'
  import AppContextPanel from './AppContextPanel.vue'

  useKeyboardShortcuts()

  // On Windows in Tauri, use semi-transparent backgrounds so Mica/Acrylic
  // bleeds through. On macOS the solid background is kept — sidebar vibrancy
  // is handled at the OS window level and each surface has its own treatment.
  const rootBg =
    isTauri && isWindows
      ? 'bg-white/[0.82] dark:bg-slate-950/[0.78]'
      : 'bg-slate-50 dark:bg-slate-950'
</script>

<template>
  <div :class="`flex h-screen w-screen overflow-hidden ${rootBg}`">
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
