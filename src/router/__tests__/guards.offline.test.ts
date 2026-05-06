import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerGuards } from '@/router/guards'
import { saveOfflineUser } from '@/lib/offlineSession'
import { tokenStorage } from '@/services/http/client'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthResponse, User } from '@/types/user.types'

const authMocks = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  changePassword: vi.fn(),
}))

vi.mock('@/services/auth.service', () => ({
  authService: authMocks,
}))

const Empty = { template: '<div />' }

const pastor: User = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'pastor@example.com',
  displayName: 'Pastor One',
  role: 'Pastor',
  churchId: '00000000-0000-4000-8000-000000000002',
  isEmailVerified: true,
  isActive: true,
  createdAt: '2026-05-05T12:00:00.000Z',
}

const member: User = {
  ...pastor,
  id: '00000000-0000-4000-8000-000000000003',
  email: 'member@example.com',
  displayName: 'Member One',
  role: 'Member',
}

const authResponse: AuthResponse = {
  user: pastor,
  accessToken: 'access',
  expiresAt: '2026-05-05T13:00:00.000Z',
}

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  setOnlineStatus(false)
  tokenStorage.set(expiredToken())
  saveOfflineUser(pastor)
  authMocks.refresh.mockRejectedValue(new Error('offline'))
})

describe('offline route guards', () => {
  it('allows notations while offline for a previously signed-in user', async () => {
    const router = makeRouter()

    await router.push('/notes')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('notes')
  })

  it('allows presenter while offline for any previously signed-in user', async () => {
    localStorage.clear()
    tokenStorage.set(expiredToken())
    saveOfflineUser(member)
    const router = makeRouter()

    await router.push('/presenter')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('presenter')
  })

  it('keeps non-offline routes behind login when token refresh cannot run', async () => {
    const router = makeRouter()

    await router.push('/plans')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/plans')
  })

  it('sends offline-ready routes to login when no cached user exists', async () => {
    localStorage.clear()
    tokenStorage.set(expiredToken())
    const router = makeRouter()

    await router.push('/notes')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/notes')
  })

  it('keeps the presenter display route available without a login session', async () => {
    localStorage.clear()
    const router = makeRouter()

    await router.push('/presenter-display')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('presenter-display')
  })

  it('does not refresh stale tokens on the presenter display route', async () => {
    setOnlineStatus(true)
    const router = makeRouter()

    await router.push('/presenter-display')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('presenter-display')
    expect(authMocks.refresh).not.toHaveBeenCalled()
  })

  it('keeps offline-ready routes available when an in-memory session expires offline', async () => {
    const router = makeRouter()
    const auth = useAuthStore()
    auth.user = pastor

    await router.push('/notes')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('notes')
    expect(auth.hasOfflineSession).toBe(true)
  })

  it('refreshes an expired in-memory session before routing online', async () => {
    const accessToken = validToken()
    setOnlineStatus(true)
    authMocks.refresh.mockImplementation(() => {
      tokenStorage.set(accessToken)
      return Promise.resolve(authResponse)
    })
    const router = makeRouter()
    const auth = useAuthStore()
    auth.user = pastor

    await router.push('/plans')
    await router.isReady()

    expect(authMocks.refresh).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.name).toBe('plans')
  })
})

function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: Empty },
      {
        path: '/',
        component: Empty,
        meta: { requiresAuth: true },
        children: [
          { path: '', name: 'dashboard', component: Empty },
          { path: 'notes', name: 'notes', component: Empty, meta: { offlineReady: true } },
          { path: 'plans', name: 'plans', component: Empty },
          { path: 'presenter', name: 'presenter', component: Empty, meta: { offlineReady: true } },
        ],
      },
      {
        path: '/presenter-display',
        name: 'presenter-display',
        component: Empty,
        meta: { authIsolated: true, offlineReady: true },
      },
    ],
  })
  registerGuards(router)
  return router
}

function expiredToken(): string {
  return ['header', btoa(JSON.stringify({ exp: 1 })), 'signature'].join('.')
}

function validToken(): string {
  return [
    'header',
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    'sig',
  ].join('.')
}

function setOnlineStatus(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  })
}
