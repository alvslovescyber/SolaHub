import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import SModal from '@/components/s/SModal.vue'

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

describe('SModal', () => {
  it('keeps large modal content scrollable within the viewport', async () => {
    const wrapper = mount(SModal, {
      attachTo: document.body,
      props: {
        open: true,
        title: 'Edit song',
        description: 'Update lyrics.',
      },
      slots: {
        default: '<div data-testid="long-content">Long content</div>',
        footer: '<button type="button">Save</button>',
      },
    })
    await nextTick()

    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement
    const header = dialog.querySelector('header') as HTMLElement
    const body = dialog.children[1] as HTMLElement
    const footer = dialog.querySelector('footer') as HTMLElement

    expect(dialog.className).toContain('max-h-[calc(100vh-2rem)]')
    expect(dialog.className).toContain('flex flex-col')
    expect(header.className).toContain('shrink-0')
    expect(body.className).toContain('overflow-y-auto')
    expect(body.className).toContain('min-h-0')
    expect(footer.className).toContain('shrink-0')
    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()
  })

  it('locks body scroll when mounted open and releases it when closed', async () => {
    const wrapper = mount(SModal, {
      attachTo: document.body,
      props: { open: true, title: 'Open modal' },
    })
    await nextTick()

    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.setProps({ open: false })
    expect(document.body.style.overflow).toBe('')
  })

  it('respects closeOnBackdrop and still closes from Escape', async () => {
    const wrapper = mount(SModal, {
      attachTo: document.body,
      props: { open: true, title: 'Open modal', closeOnBackdrop: false },
    })
    await nextTick()

    document.body.querySelector('.s-modal-backdrop')?.dispatchEvent(new MouseEvent('click'))
    expect(wrapper.emitted('close')).toBeUndefined()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
