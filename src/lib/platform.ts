// Tauri 2.x injects __TAURI_INTERNALS__ into the webview at runtime.
// When the app runs in a regular browser this key is absent.
export const isTauri: boolean = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * True when running on macOS — used by the shell to reserve space for the
 * traffic light buttons under the overlay title bar.
 */
export const isMac: boolean =
  typeof window !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/i.test(window.navigator.platform || window.navigator.userAgent || '')

export const isWindows: boolean =
  typeof window !== 'undefined' &&
  /Win/i.test(window.navigator.platform || window.navigator.userAgent || '')

/** Cmd on Mac, Ctrl elsewhere — for shortcut hints. */
export const modKeyLabel: string = isMac ? '⌘' : 'Ctrl'
