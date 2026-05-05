import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SNotationSlideCanvas from '../SNotationSlideCanvas.vue'
import SPresenterSlide from '../SPresenterSlide.vue'
import type { NotationSlide } from '@/types/presenter.types'

function makeSlide(): NotationSlide {
  return {
    source: 'notation',
    verseRef: 'notation-test',
    title: 'Slide 2',
    text: 'Church notices John 3:16 For God so loved',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #111827 0%, #0f766e 100%)',
      textTone: 'light',
    },
    elements: [
      {
        id: 'text-1',
        kind: 'text',
        text: 'Church notices',
        x: 12,
        y: 18,
        width: 76,
        height: 12,
        fontSize: 64,
        color: '#ffffff',
        align: 'center',
        fontWeight: 'bold',
      },
      {
        id: 'verse-1',
        kind: 'verse',
        reference: 'John 3:16',
        text: 'For God so loved the world',
        translation: 'KJV',
        showReference: true,
        x: 12,
        y: 42,
        width: 76,
        height: 18,
        fontSize: 42,
        color: '#ffffff',
        align: 'center',
        fontWeight: 'regular',
      },
    ],
  }
}

describe('SNotationSlideCanvas', () => {
  it('renders the same notation text used by presenter slides', () => {
    const slide = makeSlide()
    const canvas = mount(SNotationSlideCanvas, { props: { slide, mode: 'fill' } })
    const presenter = mount(SPresenterSlide, {
      props: { slide, slideKey: 'notation-test', canvasMode: true },
    })

    for (const text of ['Church notices', 'John 3:16', 'For God so loved the world']) {
      expect(canvas.text()).toContain(text)
      expect(presenter.text()).toContain(text)
    }
  })

  it('emits element pointer events without changing the rendered slide content', async () => {
    const slide = makeSlide()
    const wrapper = mount(SNotationSlideCanvas, {
      props: { slide, mode: 'fill', interactive: true, selectedElementId: 'text-1' },
    })

    await wrapper.get('button').trigger('pointerdown')

    expect(wrapper.emitted('elementPointerDown')).toHaveLength(1)
    expect(wrapper.text()).toContain('Church notices')
  })

  it('marks motion backgrounds for animated rendering', () => {
    const slide = makeSlide()
    slide.background = {
      type: 'motion',
      value: 'linear-gradient(135deg, #020617, #14b8a6, #f59e0b)',
      textTone: 'light',
    }

    const wrapper = mount(SNotationSlideCanvas, { props: { slide, mode: 'display' } })

    expect(wrapper.get('.notation-stage').classes()).toContain('solahub-motion-background')
    expect(wrapper.get('.notation-stage').attributes('style')).toContain('linear-gradient')
  })
})
