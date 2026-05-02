import { onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'

const REF_W = 1920
const REF_H = 1080

/**
 * Watches a container element and returns the scale factor needed to fit
 * a 1920×1080 canvas inside it (transform: scale + transform-origin: top left).
 *
 * The ResizeObserver callback is coalesced through requestAnimationFrame so
 * rapid resize events never cause more than one recalculation per paint frame.
 *
 * The composable reacts to containerRef changes (template refs are set after
 * mount, external refs may be set at any time), so the observer is always
 * registered against the current element.
 */
export function usePresenterScale(containerRef: Ref<HTMLElement | null>) {
  const scale = ref(1)
  let ro: ResizeObserver | null = null
  let rafId: number | null = null

  function recalc(el: HTMLElement) {
    const w = el.clientWidth
    const h = el.clientHeight
    if (w > 0 && h > 0) {
      scale.value = Math.min(w / REF_W, h / REF_H)
    }
  }

  function scheduleRecalc() {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (containerRef.value) recalc(containerRef.value)
    })
  }

  // Reactively re-register the observer when the ref target changes.
  // immediate: true handles both template refs (set after mount) and
  // externally-assigned refs (set at any point after setup).
  watch(
    containerRef,
    (el) => {
      ro?.disconnect()
      ro = null
      if (el) {
        ro = new ResizeObserver(scheduleRecalc)
        ro.observe(el)
        recalc(el)
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    ro?.disconnect()
    ro = null
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  })

  return { scale, refW: REF_W, refH: REF_H }
}
