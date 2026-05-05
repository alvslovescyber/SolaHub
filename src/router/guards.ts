import type { RouteLocationNormalized, Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { tokenStorage } from '@/services/http/client'
import { hasUsableAccessToken } from '@/lib/authTokens'

function isOfflineReadyRoute(route: RouteLocationNormalized): boolean {
  return route.matched.some((record) => record.meta.offlineReady === true)
}

export function registerGuards(router: Router): void {
  router.beforeEach(async (to, _from) => {
    const auth = useAuthStore()
    const isOfflineReady = isOfflineReadyRoute(to)
    const token = tokenStorage.getAccess()
    const hasValidToken = hasUsableAccessToken(token)

    // When the access token is missing or expired but a refresh token exists,
    // silently exchange it before routing. This prevents components from mounting
    // with a stale token and triggering unnecessary 401 console errors.
    if ((!hasValidToken || !auth.user) && tokenStorage.getRefresh()) {
      await auth.rehydrate({ force: !hasValidToken })
    }

    // Re-check after potential rehydration
    const freshToken = tokenStorage.getAccess()
    const isAuthenticated = hasUsableAccessToken(freshToken)
    const hasUser = !!auth.user
    const canUseOfflineSession = isOfflineReady && auth.hasOfflineSession

    // Route requires authentication
    if (to.meta.requiresAuth && !canUseOfflineSession && (!isAuthenticated || !hasUser)) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    // Route requires guest (not logged in)
    if (to.meta.requiresGuest && isAuthenticated && hasUser) {
      return { name: 'dashboard' }
    }

    // Route requires presenter role
    if (to.meta.requiresPresenter && !auth.isPresenter) {
      if (auth.hasOfflineSession) return { name: 'notes' }
      return { name: 'dashboard' }
    }

    return true
  })
}
