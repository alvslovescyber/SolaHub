import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

export function useAuth() {
  const store = useAuthStore()

  return {
    user: computed(() => store.user),
    isAuthenticated: computed(() => store.isAuthenticated),
    isAdmin: computed(() => store.isAdmin),
    isPresenter: computed(() => store.isPresenter),
    isLoading: computed(() => store.isLoading),
    error: computed(() => store.error),
    login: store.login,
    logout: store.logout,
    register: store.register,
    handleSessionExpired: store.handleSessionExpired,
  }
}
