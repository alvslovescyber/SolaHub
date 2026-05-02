import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { tokenStorage } from '@/services/http/client'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function registerGuards(router: Router): void {
  router.beforeEach(async (to, _from) => {
    const auth = useAuthStore()
    const token = tokenStorage.getAccess()
    const hasValidToken = !!token && !isTokenExpired(token)

    // When the access token is missing or expired but a refresh token exists,
    // silently exchange it before routing. This prevents components from mounting
    // with a stale token and triggering unnecessary 401 console errors.
    if (!hasValidToken && tokenStorage.getRefresh()) {
      await auth.rehydrate()
    }

    // Re-check after potential rehydration
    const freshToken = tokenStorage.getAccess()
    const isAuthenticated = !!freshToken && !isTokenExpired(freshToken)

    // Route requires authentication
    if (to.meta.requiresAuth && !isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    // Route requires guest (not logged in)
    if (to.meta.requiresGuest && isAuthenticated) {
      return { name: 'dashboard' }
    }

    // Route requires presenter role
    if (to.meta.requiresPresenter && !auth.isPresenter) {
      return { name: 'dashboard' }
    }

    return true
  })
}
