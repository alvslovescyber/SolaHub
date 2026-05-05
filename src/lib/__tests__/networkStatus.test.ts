import { beforeEach, describe, expect, it } from 'vitest'
import { isBrowserOffline, isNetworkError } from '@/lib/networkStatus'

beforeEach(() => {
  setOnlineStatus(true)
})

describe('networkStatus', () => {
  it('detects browser offline state', () => {
    setOnlineStatus(false)

    expect(isBrowserOffline()).toBe(true)
  })

  it('treats request failures without a response as network errors', () => {
    expect(isNetworkError({ request: {}, message: 'Network Error' })).toBe(true)
    expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true)
    expect(isNetworkError({ code: 'ECONNABORTED' })).toBe(true)
  })

  it('does not treat HTTP responses as network errors even when navigator is offline', () => {
    setOnlineStatus(false)

    expect(isNetworkError({ response: { status: 401 } })).toBe(false)
  })

  it('returns false for unknown errors while online', () => {
    expect(isNetworkError(new Error('validation failed'))).toBe(false)
  })
})

function setOnlineStatus(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  })
}
