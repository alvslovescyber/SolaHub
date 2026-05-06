<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted } from 'vue'
  import { RouterView, useRoute, useRouter } from 'vue-router'
  import { useUiStore } from '@/stores/ui.store'
  import { useAuthStore } from '@/stores/auth.store'
  import { consumeUpdateReturnRoute } from '@/lib/appUpdate'

  const ui = useUiStore()
  const auth = useAuthStore()
  const route = useRoute()
  const router = useRouter()

  const isAuthIsolatedRoute = computed(
    () =>
      route.matched.some((record) => record.meta.authIsolated === true) ||
      isPresenterDisplayLocation()
  )

  function isPresenterDisplayLocation(): boolean {
    const hashPath = window.location.hash.slice(1)
    return hashPath === '/presenter-display' || hashPath.startsWith('/presenter-display?')
  }

  // Bridges the auth-layer `auth:session-expired` browser event (dispatched by the
  // axios 401 retry interceptor when refresh fails) into the auth store so the user
  // is logged out and redirected to /login?reason=session-expired.
  function onSessionExpired() {
    if (isAuthIsolatedRoute.value) return
    auth.handleSessionExpired()
  }

  onMounted(() => {
    ui.initTheme()
    if (isAuthIsolatedRoute.value) return

    const returnRoute = consumeUpdateReturnRoute()
    if (returnRoute && returnRoute !== route.fullPath) {
      // Rehydrate first so the router guard finds a valid session when it fires
      // for the restored route after an in-app update + restart.
      void auth.rehydrate().then(() => router.replace(returnRoute))
    } else {
      void auth.rehydrate()
    }
    window.addEventListener('auth:session-expired', onSessionExpired)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('auth:session-expired', onSessionExpired)
  })
</script>

<template>
  <RouterView />
</template>
