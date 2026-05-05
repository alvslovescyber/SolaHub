import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PresenterDisplayState } from '@/stores/presenter.store'
import type { NotationSlide } from '@/types/presenter.types'

const displayMocks = vi.hoisted(() => ({
  listen: vi.fn(),
  unlisten: vi.fn(),
  collaborationOn: vi.fn(() => vi.fn()),
  eventHandler: null as ((event: { payload: PresenterDisplayState }) => void) | null,
}))

function makeSlide(): NotationSlide {
  return {
    source: 'notation',
    verseRef: 'notation-event-slide',
    title: 'Event Slide',
    text: 'The event bridge rendered this notation.',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #111827 0%, #0f766e 100%)',
      textTone: 'light',
    },
    elements: [
      {
        id: 'text-1',
        kind: 'text',
        text: 'The event bridge rendered this notation.',
        x: 12,
        y: 36,
        width: 76,
        height: 16,
        fontSize: 48,
        color: '#ffffff',
        align: 'center',
        fontWeight: 'bold',
      },
    ],
  }
}

async function mountPresenterDisplayInTauri() {
  vi.resetModules()
  displayMocks.listen.mockImplementation((_eventName, handler) => {
    displayMocks.eventHandler = handler
    return Promise.resolve(displayMocks.unlisten)
  })
  vi.doMock('@/lib/platform', () => ({
    isTauri: true,
    isMac: false,
    modKeyLabel: 'Ctrl',
  }))
  vi.doMock('@tauri-apps/api/event', () => ({
    listen: displayMocks.listen,
  }))
  vi.doMock('@/services/collaboration.service', () => ({
    collaborationService: {
      on: displayMocks.collaborationOn,
      pushPresenterVerse: vi.fn().mockResolvedValue(undefined),
    },
  }))

  const { createPinia } = await import('pinia')
  const { DISPLAY_STATE_EVENT } = await import('@/stores/presenter.store')
  const PresenterDisplayView = (await import('../PresenterDisplayView.vue')).default
  const wrapper = mount(PresenterDisplayView, {
    global: {
      plugins: [createPinia()],
    },
  })
  await flushPromises()

  return { wrapper, DISPLAY_STATE_EVENT }
}

describe('PresenterDisplayView Tauri bridge', () => {
  beforeEach(() => {
    displayMocks.listen.mockReset()
    displayMocks.unlisten.mockReset()
    displayMocks.collaborationOn.mockReset()
    displayMocks.collaborationOn.mockReturnValue(vi.fn())
    displayMocks.eventHandler = null
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('renders notation slide state received from the native presenter window event', async () => {
    const { wrapper, DISPLAY_STATE_EVENT } = await mountPresenterDisplayInTauri()

    expect(displayMocks.listen).toHaveBeenCalledWith(DISPLAY_STATE_EVENT, expect.any(Function))
    expect(wrapper.text()).toContain('Waiting for presenter')

    displayMocks.eventHandler?.({
      payload: {
        type: 'state',
        slides: [makeSlide()],
        currentIndex: 0,
        isBlanked: false,
        planId: null,
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('The event bridge rendered this notation.')
    expect(wrapper.text()).not.toContain('Waiting for presenter')

    wrapper.unmount()
    expect(displayMocks.unlisten).toHaveBeenCalledOnce()
  })
})
