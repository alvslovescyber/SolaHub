import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import SNotificationPanel from '../SNotificationPanel.vue'

describe('SNotificationPanel', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('opens beside a sidebar notification bell', async () => {
    const wrapper = mount(SNotificationPanel, {
      props: {
        open: true,
        anchorRect: { top: 36, right: 72, bottom: 64, left: 44, width: 28, height: 28 },
      },
    })
    await nextTick()

    const panel = getPanel()
    expect(panel.style.left).toBe('80px')
    expect(panel.style.top).toBe('36px')
    expect(panel.style.right).toBe('')

    wrapper.unmount()
  })

  it('opens under a topbar notification bell instead of the screen edge', async () => {
    const wrapper = mount(SNotificationPanel, {
      props: {
        open: true,
        anchorRect: { top: 20, right: 788, bottom: 48, left: 760, width: 28, height: 28 },
      },
    })
    await nextTick()

    const panel = getPanel()
    expect(panel.style.left).toBe('468px')
    expect(panel.style.top).toBe('56px')
    expect(panel.style.right).toBe('')

    wrapper.unmount()
  })
})

function getPanel(): HTMLElement {
  const panel = document.body.querySelector('[data-testid="notification-panel"]')
  expect(panel).toBeInstanceOf(HTMLElement)
  return panel as HTMLElement
}
