import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const UPDATE_RETURN_ROUTE_KEY = 'solahub:update-return-route'

type UpdateDownloadEvent =
  | { event: 'Started'; data: { contentLength?: number | null } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished' }

const updateMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  route: { fullPath: '/presenter?tab=songs' },
  lastChannel: null as { onmessage: (event: UpdateDownloadEvent) => void } | null,
}))

async function loadUpdateButton(options: { isTauri: boolean }) {
  vi.resetModules()
  vi.doMock('@/lib/platform', () => ({
    isTauri: options.isTauri,
    isMac: false,
    modKeyLabel: 'Ctrl',
  }))
  vi.doMock('@tauri-apps/api/core', () => ({
    invoke: updateMocks.invoke,
    Channel: class {
      onmessage: (event: UpdateDownloadEvent) => void

      constructor(onmessage: (event: UpdateDownloadEvent) => void) {
        this.onmessage = onmessage
        updateMocks.lastChannel = this
      }
    },
  }))
  vi.doMock('vue-router', () => ({
    useRoute: () => updateMocks.route,
  }))
  vi.doMock('../useSToast', () => ({
    useSToast: () => ({
      success: updateMocks.success,
      error: updateMocks.error,
    }),
  }))

  return (await import('../SUpdateButton.vue')).default
}

describe('SUpdateButton', () => {
  beforeEach(() => {
    updateMocks.invoke.mockReset()
    updateMocks.success.mockReset()
    updateMocks.error.mockReset()
    updateMocks.lastChannel = null
    updateMocks.route.fullPath = '/presenter?tab=songs'
    localStorage.clear()
  })

  afterEach(() => {
    vi.resetModules()
    vi.useRealTimers()
    localStorage.clear()
  })

  it('stays hidden outside the native Tauri shell', async () => {
    const SUpdateButton = await loadUpdateButton({ isTauri: false })

    const wrapper = mount(SUpdateButton)

    expect(wrapper.find('button').exists()).toBe(false)
    expect(updateMocks.invoke).not.toHaveBeenCalled()
  })

  it('renders as a native-looking sidebar action in Tauri', async () => {
    const SUpdateButton = await loadUpdateButton({ isTauri: true })

    const wrapper = mount(SUpdateButton)
    const button = wrapper.get('button')

    expect(button.text()).toBe('Update')
    expect(button.attributes('aria-label')).toBe('Update SolaHub')
    expect(button.classes()).toContain('bg-black/[0.04]')
    expect(button.classes()).toContain('border-black/[0.08]')
    expect(button.classes()).toContain('dark:bg-white/[0.05]')
  })

  it('invokes the native updater, shows progress, and preserves the current route until restart', async () => {
    let resolveUpdate: (value: unknown) => void = () => {}
    updateMocks.invoke.mockImplementation(() => {
      updateMocks.lastChannel?.onmessage({ event: 'Started', data: { contentLength: 100 } })
      updateMocks.lastChannel?.onmessage({ event: 'Progress', data: { chunkLength: 40 } })
      return new Promise((resolve) => {
        resolveUpdate = resolve
      })
    })
    const SUpdateButton = await loadUpdateButton({ isTauri: true })
    const wrapper = mount(SUpdateButton)

    await wrapper.get('button').trigger('click')
    await nextTick()

    expect(updateMocks.invoke).toHaveBeenCalledWith('install_app_update', {
      onEvent: expect.any(Object),
    })
    expect(localStorage.getItem(UPDATE_RETURN_ROUTE_KEY)).toBe('/presenter?tab=songs')
    expect(wrapper.get('button').text()).toBe('40%')

    resolveUpdate({ status: 'upToDate', currentVersion: '0.1.0', version: null })
    await flushPromises()

    expect(updateMocks.success).toHaveBeenCalledWith(
      'SolaHub is up to date',
      'Version 0.1.0 is installed.'
    )
    expect(localStorage.getItem(UPDATE_RETURN_ROUTE_KEY)).toBeNull()
  })

  it('explains when signed native updates are not configured', async () => {
    updateMocks.invoke.mockResolvedValue({
      status: 'notConfigured',
      currentVersion: '0.1.0',
      version: null,
    })
    const SUpdateButton = await loadUpdateButton({ isTauri: true })
    const wrapper = mount(SUpdateButton)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(updateMocks.error).toHaveBeenCalledWith(
      'Updates not configured',
      'Build SolaHub with a signed updater key to enable native updates.'
    )
    expect(localStorage.getItem(UPDATE_RETURN_ROUTE_KEY)).toBeNull()
  })

  it('clears the remembered route and reports native update failures', async () => {
    updateMocks.invoke.mockRejectedValue('network unavailable')
    const SUpdateButton = await loadUpdateButton({ isTauri: true })
    const wrapper = mount(SUpdateButton)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(updateMocks.error).toHaveBeenCalledWith('Update failed', 'network unavailable')
    expect(localStorage.getItem(UPDATE_RETURN_ROUTE_KEY)).toBeNull()
  })

  it('hides the button after a successful up-to-date check', async () => {
    updateMocks.invoke.mockResolvedValue({
      status: 'upToDate',
      currentVersion: '0.1.6',
      version: null,
    })
    const SUpdateButton = await loadUpdateButton({ isTauri: true })
    const wrapper = mount(SUpdateButton)

    expect(wrapper.find('button').exists()).toBe(true)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(updateMocks.success).toHaveBeenCalled()
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('hides the button after a notConfigured result', async () => {
    updateMocks.invoke.mockResolvedValue({
      status: 'notConfigured',
      currentVersion: '0.1.6',
      version: null,
    })
    const SUpdateButton = await loadUpdateButton({ isTauri: true })
    const wrapper = mount(SUpdateButton)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(updateMocks.error).toHaveBeenCalled()
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('keeps the button visible after a failed update so the user can retry', async () => {
    updateMocks.invoke.mockRejectedValue(new Error('timeout'))
    const SUpdateButton = await loadUpdateButton({ isTauri: true })
    const wrapper = mount(SUpdateButton)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(updateMocks.error).toHaveBeenCalled()
    expect(wrapper.find('button').exists()).toBe(true)
  })
})
