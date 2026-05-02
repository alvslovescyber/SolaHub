import { afterEach, describe, expect, it, vi } from 'vitest'

describe('useSToast', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  it('shows one toast at a time for three seconds each', async () => {
    vi.useFakeTimers()
    const { useSToast } = await import('../useSToast')
    const toast = useSToast()

    toast.success('Slide added', 'Slide 2')
    toast.success('Slide added', 'Slide 3')
    toast.success('Slide added', 'Slide 4')

    expect(toast.toasts.value).toHaveLength(1)
    expect(toast.toasts.value[0]?.description).toBe('Slide 2')

    await vi.advanceTimersByTimeAsync(2999)
    expect(toast.toasts.value[0]?.description).toBe('Slide 2')

    await vi.advanceTimersByTimeAsync(1)
    expect(toast.toasts.value).toHaveLength(1)
    expect(toast.toasts.value[0]?.description).toBe('Slide 3')

    await vi.advanceTimersByTimeAsync(3000)
    expect(toast.toasts.value).toHaveLength(1)
    expect(toast.toasts.value[0]?.description).toBe('Slide 4')

    await vi.advanceTimersByTimeAsync(3000)
    expect(toast.toasts.value).toHaveLength(0)
  })
})
