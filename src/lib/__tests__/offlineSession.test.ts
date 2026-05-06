import { afterEach, describe, expect, it } from 'vitest'
import { clearOfflineUser, loadOfflineUser, saveOfflineUser } from '@/lib/offlineSession'
import type { User } from '@/types/user.types'

const user: User = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'pastor@example.com',
  displayName: 'Pastor One',
  role: 'Pastor',
  churchId: '00000000-0000-4000-8000-000000000002',
  isEmailVerified: true,
  isActive: true,
  createdAt: '2026-05-05T12:00:00.000Z',
}

afterEach(() => {
  localStorage.clear()
})

describe('offlineSession', () => {
  it('stores and restores a signed-in user for offline routes', () => {
    saveOfflineUser(user)

    expect(loadOfflineUser()).toEqual(user)
  })

  it('stores offline users in a versioned cache envelope', () => {
    saveOfflineUser(user)

    const cached = JSON.parse(localStorage.getItem('solahub:offline-user') ?? '{}') as {
      schemaVersion?: unknown
      cachedAt?: unknown
      user?: unknown
    }
    expect(cached.schemaVersion).toBe(1)
    expect(typeof cached.cachedAt).toBe('string')
    expect(cached.user).toEqual(user)
  })

  it('can still read the original raw-user cache shape', () => {
    localStorage.setItem('solahub:offline-user', JSON.stringify(user))

    expect(loadOfflineUser()).toEqual(user)
  })

  it('rejects unknown cache envelope versions', () => {
    localStorage.setItem(
      'solahub:offline-user',
      JSON.stringify({ schemaVersion: 999, cachedAt: new Date().toISOString(), user })
    )

    expect(loadOfflineUser()).toBeNull()
  })

  it('rejects inactive cached users', () => {
    saveOfflineUser({ ...user, isActive: false })

    expect(loadOfflineUser()).toBeNull()
  })

  it('rejects cached users without a UUID user id', () => {
    localStorage.setItem('solahub:offline-user', JSON.stringify({ ...user, id: 'user-1' }))

    expect(loadOfflineUser()).toBeNull()
  })

  it('drops invalid cached church ids instead of trusting them', () => {
    localStorage.setItem('solahub:offline-user', JSON.stringify({ ...user, churchId: 'church-1' }))

    expect(loadOfflineUser()).toEqual({ ...user, churchId: null })
  })

  it('returns null for malformed cached user data', () => {
    localStorage.setItem('solahub:offline-user', JSON.stringify({ id: 'user-1', role: 'Owner' }))

    expect(loadOfflineUser()).toBeNull()
  })

  it('clears the cached user on sign out', () => {
    saveOfflineUser(user)
    clearOfflineUser()

    expect(loadOfflineUser()).toBeNull()
  })
})
