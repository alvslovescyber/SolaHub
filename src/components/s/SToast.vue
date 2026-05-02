<script setup lang="ts">
  import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-vue-next'
  import { useSToast, type Toast } from './useSToast'

  const { toasts, dismiss } = useSToast()

  const iconMap = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  } as const

  const toneClass = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    info: 'text-brand-500',
    warning: 'text-amber-500',
  } as const
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed top-[calc(var(--s-topbar-height)+1rem)] right-4 z-toast flex flex-col gap-2 w-[320px] pointer-events-none"
    >
      <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2">
        <div
          v-for="t in toasts as Toast[]"
          :key="t.id"
          class="pointer-events-auto flex items-start gap-3 rounded-lg bg-surface-overlay border border-line shadow-pop p-3 backdrop-blur-xl"
          role="status"
        >
          <component
            :is="iconMap[t.type]"
            :class="['h-4 w-4 mt-0.5 shrink-0', toneClass[t.type]]"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-ink-strong">
              {{ t.title }}
            </p>
            <p v-if="t.description" class="text-xs text-ink-muted mt-0.5">
              {{ t.description }}
            </p>
          </div>
          <button
            type="button"
            class="text-ink-muted hover:text-ink-strong shrink-0"
            aria-label="Dismiss"
            @click="dismiss(t.id)"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
  .toast-enter-active,
  .toast-leave-active {
    transition:
      opacity 200ms ease,
      transform 200ms ease;
  }
  .toast-enter-from {
    opacity: 0;
    transform: translateX(12px);
  }
  .toast-leave-to {
    opacity: 0;
    transform: translateX(12px);
  }
</style>
