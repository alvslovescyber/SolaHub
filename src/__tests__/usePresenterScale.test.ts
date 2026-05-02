import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import { usePresenterScale } from '@/composables/usePresenterScale'

// ── ResizeObserver mock ───────────────────────────────────────────────────────

type ROCallback = (entries: ResizeObserverEntry[]) => void

class MockResizeObserver {
  static callback: ROCallback | null = null
  static observed: Element | null = null

  constructor(cb: ROCallback) {
    MockResizeObserver.callback = cb
  }
  observe(el: Element) {
    MockResizeObserver.observed = el
  }
  disconnect() {
    MockResizeObserver.callback = null
    MockResizeObserver.observed = null
  }
}

function triggerResize(el: HTMLElement, width: number, height: number) {
  Object.defineProperty(el, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: height, configurable: true })
  MockResizeObserver.callback?.([{ target: el } as unknown as ResizeObserverEntry])
}

// ── Test harness ──────────────────────────────────────────────────────────────

function makeHarness() {
  const containerRef = ref<HTMLElement | null>(null)
  let exposedScale: ReturnType<typeof usePresenterScale>['scale'] | undefined

  const TestComponent = defineComponent({
    setup() {
      const result = usePresenterScale(containerRef)
      exposedScale = result.scale
      return result
    },
    template: '<div ref="el" />',
  })

  return { containerRef, TestComponent, getScale: () => exposedScale?.value ?? 1 }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePresenterScale', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0) // execute immediately in tests
      return 0
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    MockResizeObserver.callback = null
    MockResizeObserver.observed = null
  })

  it('exports refW = 1920 and refH = 1080', () => {
    const containerRef = ref<HTMLElement | null>(null)
    const TestComp = defineComponent({
      setup() { return usePresenterScale(containerRef) },
      template: '<div />',
    })
    const wrapper = mount(TestComp)
    expect(wrapper.vm.refW).toBe(1920)
    expect(wrapper.vm.refH).toBe(1080)
    wrapper.unmount()
  })

  it('scale defaults to 1 before any element is observed', () => {
    const containerRef = ref<HTMLElement | null>(null)
    const TestComp = defineComponent({
      setup() { return usePresenterScale(containerRef) },
      template: '<div />',
    })
    const wrapper = mount(TestComp)
    expect(wrapper.vm.scale).toBe(1)
    wrapper.unmount()
  })

  it('calculates scale correctly for a width-constrained container', async () => {
    const containerRef = ref<HTMLElement | null>(null)
    const TestComp = defineComponent({
      setup() { return usePresenterScale(containerRef) },
      template: '<div />',
    })
    const wrapper = mount(TestComp, { attachTo: document.body })
    const el = wrapper.element as HTMLElement
    containerRef.value = el

    triggerResize(el, 960, 1080) // width is limiting (960/1920 = 0.5 < 1080/1080 = 1)
    await nextTick()
    expect(wrapper.vm.scale).toBeCloseTo(0.5)
    wrapper.unmount()
  })

  it('calculates scale correctly for a height-constrained container', async () => {
    const containerRef = ref<HTMLElement | null>(null)
    const TestComp = defineComponent({
      setup() { return usePresenterScale(containerRef) },
      template: '<div />',
    })
    const wrapper = mount(TestComp, { attachTo: document.body })
    const el = wrapper.element as HTMLElement
    containerRef.value = el

    triggerResize(el, 1920, 540) // height is limiting (1920/1920 = 1 > 540/1080 = 0.5)
    await nextTick()
    expect(wrapper.vm.scale).toBeCloseTo(0.5)
    wrapper.unmount()
  })

  it('picks the smaller of width and height ratios (aspect-safe)', async () => {
    const containerRef = ref<HTMLElement | null>(null)
    const TestComp = defineComponent({
      setup() { return usePresenterScale(containerRef) },
      template: '<div />',
    })
    const wrapper = mount(TestComp, { attachTo: document.body })
    const el = wrapper.element as HTMLElement
    containerRef.value = el

    // 640 / 1920 = 0.333; 360 / 1080 = 0.333 — exactly 16:9 container
    triggerResize(el, 640, 360)
    await nextTick()
    expect(wrapper.vm.scale).toBeCloseTo(1 / 3, 2)
    wrapper.unmount()
  })

  it('ignores resize events where both dimensions are 0', async () => {
    const containerRef = ref<HTMLElement | null>(null)
    const TestComp = defineComponent({
      setup() { return usePresenterScale(containerRef) },
      template: '<div />',
    })
    const wrapper = mount(TestComp, { attachTo: document.body })
    const el = wrapper.element as HTMLElement
    containerRef.value = el

    triggerResize(el, 640, 360)
    await nextTick()
    const prevScale = wrapper.vm.scale

    triggerResize(el, 0, 0) // should not update
    await nextTick()
    expect(wrapper.vm.scale).toBe(prevScale)
    wrapper.unmount()
  })

  it('disconnects the ResizeObserver on unmount', async () => {
    const containerRef = ref<HTMLElement | null>(null)
    const TestComp = defineComponent({
      setup() { return usePresenterScale(containerRef) },
      template: '<div />',
    })
    const wrapper = mount(TestComp, { attachTo: document.body })
    // Simulate template ref assignment (Vue sets it after mount) and flush watchers
    containerRef.value = wrapper.element as HTMLElement
    await nextTick()
    expect(MockResizeObserver.callback).not.toBeNull()

    wrapper.unmount()
    expect(MockResizeObserver.callback).toBeNull()
  })
})
