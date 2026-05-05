<script setup lang="ts">
  import { RouterView } from 'vue-router'
  import { useUiStore } from '@/stores/ui.store'
  import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
  import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
  import SSidebar from './SSidebar.vue'
  import SCommandPalette from './SCommandPalette.vue'
  import SToast from './SToast.vue'

  const ui = useUiStore()

  useKeyboardShortcuts()
  useResponsiveLayout()
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden text-ink">
    <SSidebar />

    <main class="flex-1 flex min-w-0 overflow-hidden bg-surface-base s-canvas-aurora">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <SCommandPalette :open="ui.commandPaletteOpen" @close="ui.closeCommandPalette" />
    <SToast />
  </div>
</template>
