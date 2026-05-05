import { vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Fresh Pinia instance for every test — prevents store state bleeding between tests
beforeEach(() => {
  setActivePinia(createPinia())
})

// Mock Tauri APIs — not available in the test environment
vi.mock('@tauri-apps/api/core', () => ({
  Channel: class<T = unknown> {
    onmessage: (message: T) => void

    constructor(onmessage: (message: T) => void = vi.fn()) {
      this.onmessage = onmessage
    }
  },
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/window', () => ({
  availableMonitors: vi.fn().mockResolvedValue([]),
}))

// Mock platform detection — always non-Tauri in tests
vi.mock('@/lib/platform', () => ({
  isTauri: false,
  isMac: false,
  modKeyLabel: 'Ctrl',
}))

// Mock collaboration service — prevents real SignalR connections
vi.mock('@/services/collaboration.service', () => ({
  collaborationService: {
    pushPresenterVerse: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(() => vi.fn()),
  },
}))

// Stub requestFullscreen / exitFullscreen for overlay tests
Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true })
Object.defineProperty(document.documentElement, 'requestFullscreen', {
  value: vi.fn().mockResolvedValue(undefined),
  writable: true,
})
Object.defineProperty(document, 'exitFullscreen', {
  value: vi.fn().mockResolvedValue(undefined),
  writable: true,
})
