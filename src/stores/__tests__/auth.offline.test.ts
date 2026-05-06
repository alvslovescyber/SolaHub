import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadOfflineUser, saveOfflineUser } from '@/lib/offlineSession'
import { tokenStorage } from '@/services/http/client'
import { useAuthStore } from '../auth.store'
import type { AuthResponse, User } from '@/types/user.types'

const routerPush = vi.hoisted(() => vi.fn())
const authMocks = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  changePassword: vi.fn(),
}))

vi.mock('@/router', () => ({
  default: {
    push: routerPush,
  },
}))

vi.mock('@/services/auth.service', () => ({
  authService: authMocks,
}))

const user: User = {
  id: 'user-1',
  email: 'pastor@example.com',
  displayName: 'Pastor One',
  role: 'Pastor',
  churchId: 'church-1',
  isEmailVerified: true,
  isActive: true,
  createdAt: '2026-05-05T12:00:00.000Z',
}

const authResponse: AuthResponse = {
  user,
  accessToken: 'access',
  expiresAt: '2026-05-05T13:00:00.000Z',
}

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  setOnlineStatus(true)
})

describe('auth store offline session', () => {
  it('caches the signed-in user after login', async () => {
    authMocks.login.mockImplementation(() => {
      tokenStorage.set('access')
      return Promise.resolve(authResponse)
    })

    const auth = useAuthStore()
    await auth.login('pastor@example.com', 'SecureP@ss1')

    expect(loadOfflineUser()).toEqual(user)
    expect(auth.isOfflineSession).toBe(false)
  })

  it('restores cached user when token refresh cannot reach the network', async () => {
    setOnlineStatus(false)
    tokenStorage.set('expired-access')
    saveOfflineUser(user)
    authMocks.refresh.mockRejectedValue(new Error('offline'))

    const auth = useAuthStore()
    await auth.rehydrate()

    expect(auth.user).toEqual(user)
    expect(auth.hasOfflineSession).toBe(true)
    expect(tokenStorage.hasSession()).toBe(true)
  })

  it('keeps an in-memory user available when the token expires offline', async () => {
    setOnlineStatus(false)
    tokenStorage.set('expired-access')

    const auth = useAuthStore()
    auth.user = user
    await auth.rehydrate({ force: true })

    expect(auth.user).toEqual(user)
    expect(auth.hasOfflineSession).toBe(true)
    expect(loadOfflineUser()).toEqual(user)
    expect(authMocks.refresh).not.toHaveBeenCalled()
  })

  it('does not treat an expired online token as authenticated', () => {
    tokenStorage.set(expiredToken())

    const auth = useAuthStore()
    auth.user = user

    expect(auth.hasValidAccessToken).toBe(false)
    expect(auth.isAuthenticated).toBe(false)
  })

  it('treats an offline session with an expired token as authenticated for local flows', async () => {
    setOnlineStatus(false)
    tokenStorage.set(expiredToken())
    saveOfflineUser(user)
    authMocks.refresh.mockRejectedValue(new Error('offline'))

    const auth = useAuthStore()
    await auth.rehydrate()

    expect(auth.hasValidAccessToken).toBe(false)
    expect(auth.isAuthenticated).toBe(true)
  })

  it('does not call refresh while offline when no cached user exists', async () => {
    setOnlineStatus(false)
    tokenStorage.set(expiredToken())

    const auth = useAuthStore()
    await auth.rehydrate({ force: true })

    expect(authMocks.refresh).not.toHaveBeenCalled()
    expect(auth.user).toBeNull()
    expect(auth.hasOfflineSession).toBe(false)
  })

  it('refreshes an expired in-memory session when the API is reachable', async () => {
    const accessToken = validToken()
    tokenStorage.set('expired-access')
    authMocks.refresh.mockImplementation(() => {
      tokenStorage.set(accessToken)
      return Promise.resolve(authResponse)
    })

    const auth = useAuthStore()
    auth.user = user
    await auth.rehydrate({ force: true })

    expect(authMocks.refresh).toHaveBeenCalledOnce()
    expect(auth.hasOfflineSession).toBe(false)
    expect(tokenStorage.getAccess()).toBe(accessToken)
  })

  it('clears tokens and cached user when refresh is rejected by the API', async () => {
    tokenStorage.set('expired-access')
    saveOfflineUser(user)
    authMocks.refresh.mockRejectedValue({ response: { status: 401 } })

    const auth = useAuthStore()
    await auth.rehydrate()

    expect(auth.user).toBeNull()
    expect(tokenStorage.getAccess()).toBeNull()
    expect(tokenStorage.hasSession()).toBe(false)
    expect(loadOfflineUser()).toBeNull()
  })
})

function setOnlineStatus(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  })
}

function expiredToken(): string {
  return ['header', btoa(JSON.stringify({ exp: 1 })), 'sig'].join('.')
}

function validToken(): string {
  return [
    'header',
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    'sig',
  ].join('.')
}
