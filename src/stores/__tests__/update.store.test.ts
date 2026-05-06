import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUpdateStore } from '../update.store'

// Control isTauri per-test via a mutable closure so we can test both paths.
let mockIsTauri = false
vi.mock('@/lib/platform', () => ({
  get isTauri() {
    return mockIsTauri
  },
  isMac: false,
  isWindows: false,
  modKeyLabel: 'Ctrl',
}))

// Get the globally-mocked invoke from setup.ts
const { invoke } = await import('@tauri-apps/api/core')
const invokeMock = vi.mocked(invoke)

const UP_TO_DATE = { hasUpdate: false, currentVersion: '0.1.9', availableVersion: null }
const UPDATE_AVAILABLE = {
  hasUpdate: true,
  currentVersion: '0.1.9',
  availableVersion: '0.2.0',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsTauri = false
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── check() ─────────────────────────────────────────────────────────────────

describe('check()', () => {
  it('does nothing outside Tauri — invoke is never called', async () => {
    mockIsTauri = false
    const store = useUpdateStore()
    await store.check()
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('sets hasUpdate and availableVersion when an update is available', async () => {
    mockIsTauri = true
    invokeMock.mockResolvedValueOnce(UPDATE_AVAILABLE)

    const store = useUpdateStore()
    await store.check()

    expect(invokeMock).toHaveBeenCalledWith('check_app_update')
    expect(store.hasUpdate).toBe(true)
    expect(store.availableVersion).toBe('0.2.0')
  })

  it('clears hasUpdate when the app is already up to date', async () => {
    mockIsTauri = true
    // Simulate a previous check that found an update, then a follow-up that finds none.
    invokeMock.mockResolvedValueOnce(UPDATE_AVAILABLE).mockResolvedValueOnce(UP_TO_DATE)

    const store = useUpdateStore()
    await store.check()
    expect(store.hasUpdate).toBe(true)

    await store.check()
    expect(store.hasUpdate).toBe(false)
    expect(store.availableVersion).toBeNull()
  })

  it('does not throw and preserves previous state on invoke error', async () => {
    mockIsTauri = true
    invokeMock.mockResolvedValueOnce(UPDATE_AVAILABLE)
    await useUpdateStore().check() // sets hasUpdate = true

    invokeMock.mockRejectedValueOnce(new Error('Network error'))
    const store = useUpdateStore()

    // Must not throw
    await expect(store.check()).resolves.toBeUndefined()
    // State unchanged from last successful check
    expect(store.hasUpdate).toBe(true)
    expect(store.availableVersion).toBe('0.2.0')
  })

  it('silently handles string errors from Tauri IPC', async () => {
    mockIsTauri = true
    invokeMock.mockRejectedValueOnce('ipc error: backend closed')

    const store = useUpdateStore()
    await expect(store.check()).resolves.toBeUndefined()
    expect(store.hasUpdate).toBe(false)
  })
})

// ─── clearUpdate() ───────────────────────────────────────────────────────────

describe('clearUpdate()', () => {
  it('resets hasUpdate and availableVersion to their initial values', async () => {
    mockIsTauri = true
    invokeMock.mockResolvedValueOnce(UPDATE_AVAILABLE)

    const store = useUpdateStore()
    await store.check()
    expect(store.hasUpdate).toBe(true)

    store.clearUpdate()
    expect(store.hasUpdate).toBe(false)
    expect(store.availableVersion).toBeNull()
  })

  it('is a no-op when already in the default state', () => {
    const store = useUpdateStore()
    expect(() => store.clearUpdate()).not.toThrow()
    expect(store.hasUpdate).toBe(false)
    expect(store.availableVersion).toBeNull()
  })
})

// ─── startPolling() / stopPolling() ──────────────────────────────────────────

describe('startPolling()', () => {
  it('invokes check immediately on startup', async () => {
    mockIsTauri = true
    invokeMock.mockResolvedValue(UP_TO_DATE)
    vi.useFakeTimers()

    const store = useUpdateStore()
    store.startPolling()
    await vi.advanceTimersByTimeAsync(0)

    expect(invokeMock).toHaveBeenCalledWith('check_app_update')
    store.stopPolling()
  })

  it('fires check again after the 4-hour interval', async () => {
    mockIsTauri = true
    invokeMock.mockResolvedValue(UP_TO_DATE)
    vi.useFakeTimers()

    const store = useUpdateStore()
    store.startPolling()
    await vi.advanceTimersByTimeAsync(0)
    expect(invokeMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000)
    await vi.advanceTimersByTimeAsync(0)
    expect(invokeMock).toHaveBeenCalledTimes(2)

    store.stopPolling()
  })

  it('does not fire before the 4-hour mark, fires once at 4h, not again before 8h', async () => {
    mockIsTauri = true
    invokeMock.mockResolvedValue(UP_TO_DATE)
    vi.useFakeTimers()

    const store = useUpdateStore()
    store.startPolling()
    await vi.advanceTimersByTimeAsync(0)
    expect(invokeMock).toHaveBeenCalledTimes(1) // immediate check

    // 1ms before first interval — still only 1 call
    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000 - 1)
    await vi.advanceTimersByTimeAsync(0)
    expect(invokeMock).toHaveBeenCalledTimes(1)

    // Cross the 4h mark — first interval fires
    await vi.advanceTimersByTimeAsync(1)
    await vi.advanceTimersByTimeAsync(0)
    expect(invokeMock).toHaveBeenCalledTimes(2)

    // 1ms before second interval (total 8h - 1ms) — still only 2 calls
    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000 - 1)
    await vi.advanceTimersByTimeAsync(0)
    expect(invokeMock).toHaveBeenCalledTimes(2)

    store.stopPolling()
  })

  it('clears an existing timer before starting a new one (no duplicate polls)', async () => {
    mockIsTauri = true
    invokeMock.mockResolvedValue(UP_TO_DATE)
    vi.useFakeTimers()

    const store = useUpdateStore()
    store.startPolling()
    store.startPolling() // second call must not create a second interval
    await vi.advanceTimersByTimeAsync(0)

    // Two immediate checks (one per startPolling call) but only one recurring timer
    const callsAfterMount = invokeMock.mock.calls.length

    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000)
    await vi.advanceTimersByTimeAsync(0)
    expect(invokeMock).toHaveBeenCalledTimes(callsAfterMount + 1) // only one extra

    store.stopPolling()
  })
})

describe('stopPolling()', () => {
  it('prevents further automatic checks after being called', async () => {
    mockIsTauri = true
    invokeMock.mockResolvedValue(UP_TO_DATE)
    vi.useFakeTimers()

    const store = useUpdateStore()
    store.startPolling()
    await vi.advanceTimersByTimeAsync(0)
    const callsBeforeStop = invokeMock.mock.calls.length

    store.stopPolling()

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000) // advance a full day
    await vi.advanceTimersByTimeAsync(0)

    expect(invokeMock).toHaveBeenCalledTimes(callsBeforeStop)
  })

  it('is safe to call when no polling is active', () => {
    const store = useUpdateStore()
    expect(() => store.stopPolling()).not.toThrow()
  })
})
