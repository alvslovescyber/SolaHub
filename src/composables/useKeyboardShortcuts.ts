import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui.store'

export function useKeyboardShortcuts() {
  const router = useRouter()
  const ui = useUiStore()

  function handleKeydown(e: KeyboardEvent): void {
    const meta = e.metaKey || e.ctrlKey

    // Cmd/Ctrl+K → command palette
    if (meta && e.key === 'k') {
      e.preventDefault()
      ui.openCommandPalette()
      return
    }

    // Cmd/Ctrl+\ → toggle sidebar
    if (meta && e.key === '\\') {
      e.preventDefault()
      ui.toggleSidebar()
      return
    }

    // Escape → close overlays
    if (e.key === 'Escape') {
      ui.closeCommandPalette()
      return
    }

    // Navigation shortcuts (only when no input is focused)
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return
    }

    if (meta) {
      switch (e.key) {
        case '1':
          e.preventDefault()
          void router.push({ name: 'dashboard' })
          break
        case '2':
          e.preventDefault()
          void router.push({ name: 'bible' })
          break
        case '3':
          e.preventDefault()
          void router.push({ name: 'plans' })
          break
        case '4':
          e.preventDefault()
          void router.push({ name: 'notes' })
          break
        case '5':
          e.preventDefault()
          void router.push({ name: 'presenter' })
          break
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
}
