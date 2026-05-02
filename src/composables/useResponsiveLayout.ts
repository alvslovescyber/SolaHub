import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useUiStore } from '@/stores/ui.store'

/**
 * Auto-collapses the sidebar at narrow widths and tracks viewport breakpoints
 * so views can hide/show optional panels (right rail, secondary nav, etc.).
 *
 * State is module-scoped (singleton) so every consumer sees the same `userOverride`
 * and `isCompact` values — otherwise navigating between views would re-trigger
 * auto-collapse and undo the user's manual sidebar choice.
 */
const NARROW_MAX = 1100 // collapse sidebar below this
const COMPACT_MAX = 1280 // hide right rails below this

const isNarrow = ref(false)
const isCompact = ref(false)
let userOverride = false
let listenerCount = 0
let resizeListenerInstalled = false

function update() {
  if (typeof window === 'undefined') return
  const ui = useUiStore()
  const w = window.innerWidth
  const wasNarrow = isNarrow.value
  isNarrow.value = w < NARROW_MAX
  isCompact.value = w < COMPACT_MAX

  if (!userOverride) {
    if (isNarrow.value && !ui.sidebarCollapsed) ui.toggleSidebar()
    else if (!isNarrow.value && ui.sidebarCollapsed && wasNarrow) ui.toggleSidebar()
  }
}

/**
 * Mark that the user has explicitly toggled the sidebar so the resize
 * listener stops auto-collapsing/expanding. Call this from any UI control
 * that lets the user manually toggle the sidebar (currently `SSidebar`).
 */
function rememberUserToggle() {
  userOverride = true
}

export function useResponsiveLayout() {
  onMounted(() => {
    listenerCount += 1
    if (!resizeListenerInstalled) {
      window.addEventListener('resize', update)
      resizeListenerInstalled = true
    }
    update()
  })

  onBeforeUnmount(() => {
    listenerCount = Math.max(0, listenerCount - 1)
    if (listenerCount === 0 && resizeListenerInstalled) {
      window.removeEventListener('resize', update)
      resizeListenerInstalled = false
    }
  })

  return { isNarrow, isCompact, rememberUserToggle }
}
