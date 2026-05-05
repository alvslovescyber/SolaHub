import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPlanPresentation, setPlanPresentation } from '@/lib/planPresentation'

const STORAGE_KEY = 'solahub:plan-presentation'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('planPresentation', () => {
  it('returns defaults when the cache is malformed', () => {
    localStorage.setItem(STORAGE_KEY, '{bad-json')

    expect(getPlanPresentation('plan-1')).toEqual({ emoji: '📖', colorId: 'brand' })
  })

  it('normalizes invalid cached presentation values', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ' plan-1 ': { emoji: '<script>', colorId: 'unknown' },
      })
    )

    expect(getPlanPresentation('plan-1')).toEqual({ emoji: '📖', colorId: 'brand' })
  })

  it('persists only valid plan presentation options', () => {
    setPlanPresentation('plan-1', { emoji: '🔥', colorId: 'rose' })

    expect(getPlanPresentation('plan-1')).toEqual({ emoji: '🔥', colorId: 'rose' })
  })

  it('ignores empty plan ids', () => {
    setPlanPresentation('   ', { emoji: '🔥', colorId: 'rose' })

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('does not throw when storage writes fail', () => {
    vi.stubGlobal('localStorage', {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(() => null),
      key: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      }),
    })

    expect(() => setPlanPresentation('plan-1', { emoji: '🔥', colorId: 'rose' })).not.toThrow()
  })
})
