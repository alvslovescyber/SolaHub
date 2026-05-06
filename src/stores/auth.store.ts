import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import router from '@/router'
import { authService } from '@/services/auth.service'
import { tokenStorage } from '@/services/http/client'
import { hasUsableAccessToken } from '@/lib/authTokens'
import { clearOfflineUser, loadOfflineUser, saveOfflineUser } from '@/lib/offlineSession'
import { isBrowserOffline, isNetworkError } from '@/lib/networkStatus'
import { useNotesStore } from '@/stores/notes.store'
import { usePlansStore } from '@/stores/plans.store'
import { useCommunityStore } from '@/stores/community.store'
import { useVerseAnnotationsStore } from '@/stores/verseAnnotations.store'
import type { User } from '@/types/user.types'

interface RehydrateOptions {
  force?: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isOfflineSession = ref(false)

  const hasValidAccessToken = computed(() => hasUsableAccessToken(tokenStorage.getAccess()))
  const isAuthenticated = computed(
    () => user.value !== null && (hasValidAccessToken.value || isOfflineSession.value)
  )
  const hasOfflineSession = computed(() => user.value !== null && isOfflineSession.value)
  const isAdmin = computed(() => user.value?.role === 'Admin')
  const isPresenter = computed(() => user.value !== null)

  async function register(email: string, password: string, displayName: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await authService.register(email, password, displayName)
      setOnlineUser(response.user)
      await router.push({ name: 'dashboard' })
    } catch (e: unknown) {
      error.value = extractErrorMessage(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function login(email: string, password: string, redirect?: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await authService.login(email, password)
      setOnlineUser(response.user)
      await router.push(normalizeRedirect(redirect))
    } catch (e: unknown) {
      error.value = extractErrorMessage(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    await authService.logout().catch(() => {})
    clearSessionState()
    await router.push({ name: 'login' })
  }

  function clearSessionState(): void {
    user.value = null
    isOfflineSession.value = false
    clearOfflineUser()
    tokenStorage.clear()
    useNotesStore().reset()
    usePlansStore().reset()
    useCommunityStore().reset()
    const annotations = useVerseAnnotationsStore()
    annotations.reset()
    annotations.useScope(null)
  }

  function updateUser(partial: Partial<User>): void {
    if (user.value) {
      user.value = { ...user.value, ...partial }
      saveOfflineUser(user.value)
    }
  }

  function handleSessionExpired(): void {
    if (isBrowserOffline() && restoreOfflineUser()) return
    clearSessionState()
    void router.push({ name: 'login', query: { reason: 'session-expired' } })
  }

  /**
   * Restore the user object on app boot or when a route needs a fresh token.
   * Network failures preserve an offline session for routes that are explicitly
   * local-first; API rejections still clear state so revoked sessions do not
   * continue once the server can be reached.
   */
  async function rehydrate(options: RehydrateOptions = {}): Promise<void> {
    if (!tokenStorage.hasSession()) return
    if (user.value && !options.force) return
    if (isBrowserOffline()) {
      if (user.value) enterOfflineSession(user.value)
      else restoreOfflineUser()
      return
    }

    try {
      const response = await authService.refresh()
      setOnlineUser(response.user)
    } catch (e) {
      if (isNetworkError(e) && user.value) {
        enterOfflineSession(user.value)
        return
      }
      if (isNetworkError(e) && restoreOfflineUser()) return
      clearSessionState()
    }
  }

  function setOnlineUser(nextUser: User): void {
    user.value = nextUser
    isOfflineSession.value = false
    saveOfflineUser(nextUser)
    useVerseAnnotationsStore().useScope(nextUser.id)
  }

  function restoreOfflineUser(): boolean {
    if (!tokenStorage.hasSession()) return false
    const cached = loadOfflineUser()
    if (!cached) return false

    enterOfflineSession(cached)
    return true
  }

  function enterOfflineSession(nextUser: User): void {
    user.value = nextUser
    isOfflineSession.value = true
    saveOfflineUser(nextUser)
    useVerseAnnotationsStore().useScope(nextUser.id)
  }

  return {
    user,
    isLoading,
    error,
    isOfflineSession,
    hasValidAccessToken,
    isAuthenticated,
    hasOfflineSession,
    isAdmin,
    isPresenter,
    register,
    login,
    logout,
    updateUser,
    handleSessionExpired,
    rehydrate,
    restoreOfflineUser,
  }
})

function normalizeRedirect(redirect?: string): string | { name: string } {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return { name: 'dashboard' }
  }
  return redirect
}

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
