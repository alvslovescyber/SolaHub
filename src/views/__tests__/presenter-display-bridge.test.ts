import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DISPLAY_STATE_EVENT, type PresenterDisplayState } from '@/stores/presenter.store'
import type { NotationSlide } from '@/types/presenter.types'
import PresenterDisplayView from '../PresenterDisplayView.vue'

const displayMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
  emit: vi.fn(),
  unlisten: vi.fn(),
  windowUnlisten: vi.fn(),
  onResized: vi.fn(),
  isMinimized: vi.fn(),
  pushPresenterVerse: vi.fn(),
  collaborationOn: vi.fn(() => vi.fn()),
  eventHandler: null as ((event: { payload: PresenterDisplayState }) => void) | null,
  windowResizeHandler: null as (() => void) | null,
}))

vi.mock('@/lib/platform', () => ({
  isTauri: true,
  isMac: false,
  modKeyLabel: 'Ctrl',
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: displayMocks.listen,
  emit: displayMocks.emit,
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: displayMocks.invoke,
}))

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    onResized: displayMocks.onResized,
    isMinimized: displayMocks.isMinimized,
  }),
}))

vi.mock('@/services/collaboration.service', () => ({
  collaborationService: {
    on: displayMocks.collaborationOn,
    pushPresenterVerse: displayMocks.pushPresenterVerse,
  },
}))

function makeSlide(index = 1): NotationSlide {
  return {
    source: 'notation',
    verseRef: `notation-event-slide-${index}`,
    title: `Event Slide ${index}`,
    text: `The event bridge rendered notation ${index}.`,
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #111827 0%, #0f766e 100%)',
      textTone: 'light',
    },
    elements: [
      {
        id: 'text-1',
        kind: 'text',
        text: `The event bridge rendered notation ${index}.`,
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
  displayMocks.listen.mockImplementation((_eventName, handler) => {
    displayMocks.eventHandler = handler
    return Promise.resolve(displayMocks.unlisten)
  })

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
    displayMocks.invoke.mockReset()
    displayMocks.invoke.mockResolvedValue(undefined)
    displayMocks.listen.mockReset()
    displayMocks.emit.mockReset()
    displayMocks.emit.mockResolvedValue(undefined)
    displayMocks.unlisten.mockReset()
    displayMocks.windowUnlisten.mockReset()
    displayMocks.onResized.mockReset()
    displayMocks.onResized.mockImplementation((handler) => {
      displayMocks.windowResizeHandler = handler
      return Promise.resolve(displayMocks.windowUnlisten)
    })
    displayMocks.isMinimized.mockReset()
    displayMocks.isMinimized.mockResolvedValue(false)
    displayMocks.pushPresenterVerse.mockReset()
    displayMocks.pushPresenterVerse.mockResolvedValue(undefined)
    displayMocks.collaborationOn.mockReset()
    displayMocks.collaborationOn.mockReturnValue(vi.fn())
    displayMocks.eventHandler = null
    displayMocks.windowResizeHandler = null
  })

  it('renders notation slide state received from the native presenter window event', async () => {
    const { wrapper, DISPLAY_STATE_EVENT } = await mountPresenterDisplayInTauri()

    expect(displayMocks.listen).toHaveBeenCalledWith(DISPLAY_STATE_EVENT, expect.any(Function))
    expect(wrapper.find('[data-testid="presenter-display-root"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Waiting for presenter')
    expect(wrapper.text()).not.toContain('Welcome back to SolaHub')

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

    expect(wrapper.text()).toContain('The event bridge rendered notation 1.')
    expect(wrapper.text()).not.toContain('Waiting for presenter')

    wrapper.unmount()
    expect(displayMocks.unlisten).toHaveBeenCalledOnce()
  })

  it('advances and rewinds the displayed slide with arrow keys', async () => {
    const { wrapper } = await mountPresenterDisplayInTauri()

    displayMocks.eventHandler?.({
      payload: {
        type: 'state',
        slides: [makeSlide(1), makeSlide(2)],
        currentIndex: 0,
        isBlanked: false,
        planId: 'plan-1',
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('The event bridge rendered notation 1.')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await flushPromises()
    expect(wrapper.text()).toContain('The event bridge rendered notation 2.')
    expect(displayMocks.pushPresenterVerse).not.toHaveBeenCalled()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    await flushPromises()
    expect(wrapper.text()).toContain('The event bridge rendered notation 1.')

    wrapper.unmount()
  })

  it('closes the native presenter window when the presenter output is minimized', async () => {
    const { wrapper } = await mountPresenterDisplayInTauri()

    await vi.waitFor(() => expect(displayMocks.onResized).toHaveBeenCalled())
    displayMocks.isMinimized.mockResolvedValue(true)

    displayMocks.windowResizeHandler?.()

    await vi.waitFor(() => {
      expect(displayMocks.invoke).toHaveBeenCalledWith('close_presenter_window')
    })

    wrapper.unmount()
    expect(displayMocks.windowUnlisten).toHaveBeenCalledOnce()
  })

  it('closes the native presenter window when Escape is pressed', async () => {
    const { wrapper } = await mountPresenterDisplayInTauri()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    await vi.waitFor(() => {
      expect(displayMocks.invoke).toHaveBeenCalledWith('close_presenter_window')
    })

    wrapper.unmount()
  })
})
