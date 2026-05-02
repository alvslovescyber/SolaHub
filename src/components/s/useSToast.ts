import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  type: ToastType
  title: string
  description?: string
  durationMs: number
}

const toasts = ref<Toast[]>([])
let nextId = 1

function push(type: ToastType, title: string, description?: string, durationMs = 4000): number {
  const id = nextId++
  toasts.value.push({ id, type, title, description, durationMs })
  if (durationMs > 0) {
    window.setTimeout(() => dismiss(id), durationMs)
  }
  return id
}

function dismiss(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function useSToast() {
  return {
    toasts,
    dismiss,
    success: (title: string, description?: string, ms?: number) =>
      push('success', title, description, ms),
    error: (title: string, description?: string, ms?: number) =>
      push('error', title, description, ms),
    info: (title: string, description?: string, ms?: number) =>
      push('info', title, description, ms),
    warning: (title: string, description?: string, ms?: number) =>
      push('warning', title, description, ms),
  }
}
