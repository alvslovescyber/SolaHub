import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark' | 'system'
export type SidebarSection =
  | 'dashboard'
  | 'bible'
  | 'plans'
  | 'notes'
  | 'presenter'
  | 'community'
  | 'settings'

export const useUiStore = defineStore('ui', () => {
  const theme = ref<Theme>((localStorage.getItem('solahub:theme') as Theme) ?? 'system')
  const sidebarCollapsed = ref(false)
  const activeSection = ref<SidebarSection>('dashboard')
  const contextPanelOpen = ref(false)
  const commandPaletteOpen = ref(false)

  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (theme.value !== 'system') return theme.value
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  function setTheme(newTheme: Theme): void {
    theme.value = newTheme
    localStorage.setItem('solahub:theme', newTheme)
    applyTheme(resolvedTheme.value)
  }

  function applyTheme(resolved: 'light' | 'dark'): void {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }

  function initTheme(): void {
    applyTheme(resolvedTheme.value)

    // Watch for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (theme.value === 'system') {
        applyTheme(e.matches ? 'dark' : 'light')
      }
    })
  }

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setActiveSection(section: SidebarSection): void {
    activeSection.value = section
  }

  function toggleContextPanel(): void {
    contextPanelOpen.value = !contextPanelOpen.value
  }

  function openCommandPalette(): void {
    commandPaletteOpen.value = true
  }

  function closeCommandPalette(): void {
    commandPaletteOpen.value = false
  }

  return {
    theme,
    sidebarCollapsed,
    activeSection,
    contextPanelOpen,
    commandPaletteOpen,
    resolvedTheme,
    setTheme,
    initTheme,
    toggleSidebar,
    setActiveSection,
    toggleContextPanel,
    openCommandPalette,
    closeCommandPalette,
  }
})
