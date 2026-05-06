import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, tokenStorage } from '../http/client'

vi.mock('@/lib/safeStorage', () => {
  const store = new Map<string, string>()
  return {
    getStorageItem: (key: string) => store.get(key) ?? null,
    setStorageItem: (key: string, value: string) => store.set(key, value),
    removeStorageItem: (key: string) => store.delete(key),
  }
})

vi.mock('@/lib/networkStatus', () => ({
  isNetworkError: () => false,
}))

describe('http client', () => {
  describe('axios defaults', () => {
    it('does not use the legacy port 5000 as base URL', () => {
      // Regression: previously defaulted to :5000 which is macOS AirPlay Receiver,
      // not the API. The API runs on :3000 (Program.cs Kestrel config).
      expect(http.defaults.baseURL).not.toMatch(/:5000/)
    })

    it('uses a 15-second request timeout', () => {
      expect(http.defaults.timeout).toBe(15_000)
    })

    it('sends JSON content-type by default', () => {
      const headers = http.defaults.headers as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  describe('API base URL fallback', () => {
    it('does not fall back to the legacy port 5000', () => {
      // Regression guard: :5000 is macOS AirPlay Receiver — never the API.
      // The API binds to :3000 (Program.cs Kestrel config).
      expect(http.defaults.baseURL).not.toMatch(/:5000/)
    })

    it('honours an explicit VITE_API_URL override', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_URL', 'https://api.staging.example.com')
      try {
        const { http: freshHttp } = await import('../http/client')
        expect(freshHttp.defaults.baseURL).toBe('https://api.staging.example.com')
      } finally {
        vi.unstubAllEnvs()
      }
    })
  })

  describe('tokenStorage', () => {
    beforeEach(() => tokenStorage.clear())

    it('stores access token in memory and marks the session', () => {
      tokenStorage.set('acc-abc')
      expect(tokenStorage.getAccess()).toBe('acc-abc')
      expect(tokenStorage.hasSession()).toBe(true)
    })

    it('clears access token and session marker', () => {
      tokenStorage.set('acc-abc')
      tokenStorage.clear()
      expect(tokenStorage.getAccess()).toBeNull()
      expect(tokenStorage.hasSession()).toBe(false)
    })

    it('returns null when no token has been stored', () => {
      expect(tokenStorage.getAccess()).toBeNull()
      expect(tokenStorage.hasSession()).toBe(false)
    })

    it('overwrites access token on subsequent set calls', () => {
      tokenStorage.set('old-acc')
      tokenStorage.set('new-acc')
      expect(tokenStorage.getAccess()).toBe('new-acc')
      expect(tokenStorage.hasSession()).toBe(true)
    })
  })
})
