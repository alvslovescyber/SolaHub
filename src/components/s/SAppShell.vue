<script setup lang="ts">
  import { onMounted } from 'vue'
  import { RouterView } from 'vue-router'
  import { useAuthStore } from '@/stores/auth.store'
  import { useUiStore } from '@/stores/ui.store'
  import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
  import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
  import SSidebar from './SSidebar.vue'
  import SCommandPalette from './SCommandPalette.vue'
  import SToast from './SToast.vue'

  const auth = useAuthStore()
  const ui = useUiStore()

  useKeyboardShortcuts()
  useResponsiveLayout()

  onMounted(() => {
    window.addEventListener('auth:session-expired', () => auth.handleSessionExpired())
  })
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
