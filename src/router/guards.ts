import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { tokenStorage } from '@/services/http/client'

export function registerGuards(router: Router): void {
  router.beforeEach((to, _from) => {
    const hasToken = !!tokenStorage.getAccess()

    // Route requires authentication
    if (to.meta.requiresAuth && !hasToken) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    // Route requires guest (not logged in)
    if (to.meta.requiresGuest && hasToken) {
      return { name: 'dashboard' }
    }

    // Route requires presenter role
    if (to.meta.requiresPresenter) {
      // Auth store may not be initialized yet; check lazily
      const auth = useAuthStore()
      if (!auth.isPresenter) {
        return { name: 'dashboard' }
      }
    }

    return true
  })
}
