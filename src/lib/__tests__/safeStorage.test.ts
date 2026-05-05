import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getStorageItem,
  readJsonStorage,
  removeStorageItem,
  setStorageItem,
  writeJsonStorage,
} from '@/lib/safeStorage'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

function stubStorage(overrides: Partial<Storage>): void {
  vi.stubGlobal('localStorage', {
    length: 0,
    clear: vi.fn(),
    getItem: vi.fn(() => null),
    key: vi.fn(() => null),
    removeItem: vi.fn(),
    setItem: vi.fn(),
    ...overrides,
  })
}

describe('safeStorage', () => {
  it('reads and writes string values when storage is available', () => {
    expect(setStorageItem('safe:key', 'value')).toBe(true)
    expect(getStorageItem('safe:key')).toBe('value')
  })

  it('returns null when a storage read throws', () => {
    stubStorage({
      getItem: vi.fn(() => {
        throw new Error('storage unavailable')
      }),
    })

    expect(getStorageItem('safe:key')).toBeNull()
  })

  it('returns false instead of throwing when a storage write fails', () => {
    stubStorage({
      setItem: vi.fn(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      }),
    })

    expect(setStorageItem('safe:key', 'value')).toBe(false)
    expect(writeJsonStorage('safe:json', { ok: true })).toBe(false)
  })

  it('returns false instead of throwing when a storage remove fails', () => {
    stubStorage({
      removeItem: vi.fn(() => {
        throw new Error('storage unavailable')
      }),
    })

    expect(removeStorageItem('safe:key')).toBe(false)
  })

  it('returns the fallback for malformed JSON', () => {
    localStorage.setItem('safe:json', '{not-json')

    expect(readJsonStorage('safe:json', { ok: false })).toEqual({ ok: false })
  })

  it('applies a normalizer before returning parsed JSON', () => {
    localStorage.setItem('safe:json', JSON.stringify({ enabled: 'yes' }))

    expect(
      readJsonStorage('safe:json', { enabled: false }, (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null
        return { enabled: (value as { enabled?: unknown }).enabled === true }
      })
    ).toEqual({ enabled: false })
  })
})
