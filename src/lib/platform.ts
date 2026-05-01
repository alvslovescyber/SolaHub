// Tauri 2.x injects __TAURI_INTERNALS__ into the webview at runtime.
// When the app runs in a regular browser this key is absent.
export const isTauri: boolean = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
