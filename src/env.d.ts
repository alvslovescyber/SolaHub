/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly TAURI_ENV_PLATFORM: string
  readonly TAURI_ENV_ARCH: string
  readonly TAURI_ENV_FAMILY: string
  readonly TAURI_ENV_DEBUG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
