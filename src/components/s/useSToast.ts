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
const queue: Toast[] = []
let nextId = 1
let activeTimer: number | null = null
const TOAST_DURATION_MS = 3000

function showNext(): void {
  if (toasts.value.length > 0) return
  const next = queue.shift()
  if (!next) return

  toasts.value = [next]
  activeTimer = window.setTimeout(() => dismiss(next.id), next.durationMs)
}

function push(type: ToastType, title: string, description?: string): number {
  const id = nextId++
  queue.push({ id, type, title, description, durationMs: TOAST_DURATION_MS })
  showNext()
  return id
}

function dismiss(id: number): void {
  if (activeTimer !== null) {
    window.clearTimeout(activeTimer)
    activeTimer = null
  }
  toasts.value = toasts.value.filter((t) => t.id !== id)
  showNext()
}

export function useSToast() {
  return {
    toasts,
    dismiss,
    success: (title: string, description?: string) => push('success', title, description),
    error: (title: string, description?: string) => push('error', title, description),
    info: (title: string, description?: string) => push('info', title, description),
    warning: (title: string, description?: string) => push('warning', title, description),
  }
}
