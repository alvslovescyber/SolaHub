import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import type { DisplayMonitor } from '../useDisplayMonitors'

const monitorMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  availableMonitors: vi.fn(),
}))

async function mountComposable(isTauri: boolean) {
  vi.resetModules()
  vi.doMock('@/lib/platform', () => ({
    isTauri,
    isMac: false,
    modKeyLabel: 'Ctrl',
  }))
  vi.doMock('@tauri-apps/api/core', () => ({
    invoke: monitorMocks.invoke,
  }))
  vi.doMock('@tauri-apps/api/window', () => ({
    availableMonitors: monitorMocks.availableMonitors,
  }))

  const { useDisplayMonitors } = await import('../useDisplayMonitors')
  const TestComponent = defineComponent({
    setup() {
      return useDisplayMonitors()
    },
    template: '<div />',
  })

  const wrapper = mount(TestComponent)
  await flushPromises()
  return wrapper
}

describe('useDisplayMonitors', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('uses native monitor metadata and defaults to the secondary display', async () => {
    const nativeMonitors: DisplayMonitor[] = [
      {
        name: 'Built-in Retina Display',
        width: 3024,
        height: 1964,
        scaleFactor: 2,
        isPrimary: true,
      },
      {
        name: 'Studio Display',
        width: 5120,
        height: 2880,
        scaleFactor: 2,
        isPrimary: false,
      },
    ]
    monitorMocks.invoke.mockResolvedValue(nativeMonitors)

    const wrapper = await mountComposable(true)

    expect(monitorMocks.invoke).toHaveBeenCalledWith('get_display_monitors')
    expect(monitorMocks.availableMonitors).not.toHaveBeenCalled()
    expect(wrapper.vm.monitors).toEqual(nativeMonitors)
    expect(wrapper.vm.selectedMonitorIndex).toBe(1)
    wrapper.unmount()
  })

  it('falls back to Tauri window monitors when native metadata is unavailable', async () => {
    monitorMocks.invoke.mockRejectedValue(new Error('native command missing'))
    monitorMocks.availableMonitors.mockResolvedValue([
      {
        name: 'Monitor #5218',
        size: { width: 1920, height: 1080 },
        scaleFactor: 1,
      },
      {
        name: null,
        size: { width: 1280, height: 720 },
        scaleFactor: 1,
      },
    ])

    const wrapper = await mountComposable(true)

    expect(wrapper.vm.monitors).toEqual([
      {
        name: 'Monitor #5218',
        width: 1920,
        height: 1080,
        scaleFactor: 1,
        isPrimary: true,
      },
      {
        name: 'Monitor 2',
        width: 1280,
        height: 720,
        scaleFactor: 1,
        isPrimary: false,
      },
    ])
    expect(wrapper.vm.selectedMonitorIndex).toBe(1)
    wrapper.unmount()
  })

  it('keeps the browser fallback outside Tauri', async () => {
    const wrapper = await mountComposable(false)

    expect(monitorMocks.invoke).not.toHaveBeenCalled()
    expect(monitorMocks.availableMonitors).not.toHaveBeenCalled()
    expect(wrapper.vm.monitors[0]).toMatchObject({
      name: 'Primary Display',
      isPrimary: true,
    })
    expect(wrapper.vm.selectedMonitorIndex).toBe(0)
    wrapper.unmount()
  })
})
