import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { authService } from '@/services/auth.service'
import { tokenStorage } from '@/services/http/client'
import type { User } from '@/types/user.types'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null && !!tokenStorage.getAccess())
  const isAdmin = computed(() => user.value?.role === 'Admin')
  const isPresenter = computed(
    () => user.value?.role === 'Presenter' || user.value?.role === 'Pastor' || isAdmin.value
  )

  async function register(email: string, password: string, displayName: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await authService.register(email, password, displayName)
      user.value = response.user
      await router.push({ name: 'dashboard' })
    } catch (e: unknown) {
      error.value = extractErrorMessage(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function login(email: string, password: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await authService.login(email, password)
      user.value = response.user
      await router.push({ name: 'dashboard' })
    } catch (e: unknown) {
      error.value = extractErrorMessage(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    await authService.logout().catch(() => {})
    user.value = null
    await router.push({ name: 'login' })
  }

  function handleSessionExpired(): void {
    user.value = null
    tokenStorage.clear()
    void router.push({ name: 'login', query: { reason: 'session-expired' } })
  }

  /**
   * Restore the user object on app boot. If a refresh token exists in storage
   * we trade it in for a fresh access token + user payload; on failure we
   * silently clear tokens so the router guard sends the visitor to /login.
   */
  async function rehydrate(): Promise<void> {
    if (user.value) return
    if (!tokenStorage.getRefresh()) return
    try {
      const response = await authService.refresh()
      user.value = response.user
    } catch {
      tokenStorage.clear()
    }
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    isAdmin,
    isPresenter,
    register,
    login,
    logout,
    handleSessionExpired,
    rehydrate,
  }
})

function extractErrorMessage(e: unknown): string {
  if (
    typeof e === 'object' &&
    e !== null &&
    'response' in e &&
    typeof (e as { response?: { data?: { description?: string } } }).response?.data?.description ===
      'string'
  ) {
    return (e as { response: { data: { description: string } } }).response.data.description
  }
  if (e instanceof Error) return e.message
  return 'An unexpected error occurred.'
}
