<script setup lang="ts">
  import { onBeforeUnmount, onMounted } from 'vue'
  import { RouterView } from 'vue-router'
  import { useUiStore } from '@/stores/ui.store'
  import { useAuthStore } from '@/stores/auth.store'

  const ui = useUiStore()
  const auth = useAuthStore()

  // Bridges the auth-layer `auth:session-expired` browser event (dispatched by the
  // axios 401 retry interceptor when refresh fails) into the auth store so the user
  // is logged out and redirected to /login?reason=session-expired.
  function onSessionExpired() {
    auth.handleSessionExpired()
  }

  onMounted(() => {
    ui.initTheme()
    void auth.rehydrate()
    window.addEventListener('auth:session-expired', onSessionExpired)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('auth:session-expired', onSessionExpired)
  })
</script>

<template>
  <RouterView />
</template>
