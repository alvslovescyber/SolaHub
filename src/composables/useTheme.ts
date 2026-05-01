import { computed } from 'vue'
import { useUiStore } from '@/stores/ui.store'
import type { Theme } from '@/stores/ui.store'

export function useTheme() {
  const ui = useUiStore()

  return {
    theme: computed(() => ui.theme),
    resolvedTheme: computed(() => ui.resolvedTheme),
    setTheme: (t: Theme) => ui.setTheme(t),
    isDark: computed(() => ui.resolvedTheme === 'dark'),
  }
}
