// Unmock platform so these tests hit the real module, not the test-suite stub.
vi.unmock('@/lib/platform')

import { describe, it, expect, vi, afterEach } from 'vitest'

function setPlatform(platform: string) {
  Object.defineProperty(window.navigator, 'platform', {
    value: platform,
    configurable: true,
  })
}

afterEach(() => {
  vi.resetModules()
  // Restore to whatever the test runner's actual platform is.
  Object.defineProperty(window.navigator, 'platform', {
    value: '',
    configurable: true,
  })
})

async function loadPlatform() {
  vi.resetModules()
  return import('../platform')
}

describe('platform', () => {
  describe('isWindows', () => {
    it('is true when navigator.platform is Win32', async () => {
      setPlatform('Win32')
      const { isWindows } = await loadPlatform()
      expect(isWindows).toBe(true)
    })

    it('is true when navigator.platform is Win64', async () => {
      setPlatform('Win64')
      const { isWindows } = await loadPlatform()
      expect(isWindows).toBe(true)
    })

    it('is false when navigator.platform is MacIntel', async () => {
      setPlatform('MacIntel')
      const { isWindows } = await loadPlatform()
      expect(isWindows).toBe(false)
    })

    it('is false when navigator.platform is Linux x86_64', async () => {
      setPlatform('Linux x86_64')
      const { isWindows } = await loadPlatform()
      expect(isWindows).toBe(false)
    })

    it('is false when navigator.platform is iPhone', async () => {
      setPlatform('iPhone')
      const { isWindows } = await loadPlatform()
      expect(isWindows).toBe(false)
    })
  })

  describe('isMac', () => {
    it('is true when navigator.platform is MacIntel', async () => {
      setPlatform('MacIntel')
      const { isMac } = await loadPlatform()
      expect(isMac).toBe(true)
    })

    it('is true when navigator.platform is MacARM', async () => {
      setPlatform('MacARM')
      const { isMac } = await loadPlatform()
      expect(isMac).toBe(true)
    })

    it('is false when navigator.platform is Win32', async () => {
      setPlatform('Win32')
      const { isMac } = await loadPlatform()
      expect(isMac).toBe(false)
    })
  })

  describe('mutual exclusivity', () => {
    it('isWindows and isMac are never both true for any platform string', async () => {
      for (const platform of ['Win32', 'MacIntel', 'Linux x86_64', 'iPhone', '']) {
        setPlatform(platform)
        const mod = await loadPlatform()
        expect(mod.isWindows && mod.isMac, `Both true for platform="${platform}"`).toBe(false)
      }
    })
  })

  describe('modKeyLabel', () => {
    it('returns Ctrl on non-Mac platforms', async () => {
      setPlatform('Win32')
      const { modKeyLabel } = await loadPlatform()
      expect(modKeyLabel).toBe('Ctrl')
    })

    it('returns ⌘ on Mac platforms', async () => {
      setPlatform('MacIntel')
      const { modKeyLabel } = await loadPlatform()
      expect(modKeyLabel).toBe('⌘')
    })
  })
})
