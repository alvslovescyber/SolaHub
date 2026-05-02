<script setup lang="ts">
  import { onBeforeUnmount, onMounted } from 'vue'
  import { BellOff, X } from 'lucide-vue-next'

  interface Props {
    open: boolean
  }

  defineProps<Props>()
  const emit = defineEmits<{ close: [] }>()

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
  }
  onMounted(() => document.addEventListener('keydown', onKey))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="notif-panel">
      <div
        v-if="open"
        class="fixed inset-0 z-[200] pointer-events-none"
        @mousedown.self="emit('close')"
      >
        <!-- Click-away backdrop -->
        <div
          class="absolute inset-0 pointer-events-auto"
          @mousedown="emit('close')"
        />

        <!-- Panel — anchored top-right, below traffic light area -->
        <div
          class="absolute top-[52px] right-3 w-[320px] pointer-events-auto rounded-xl border border-line bg-surface-overlay shadow-pop backdrop-blur-2xl overflow-hidden"
          @mousedown.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-line-subtle">
            <p class="text-[13px] font-semibold text-ink-strong font-sans">
              Notifications
            </p>
            <button
              type="button"
              class="h-6 w-6 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-canvas hover:text-ink-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              aria-label="Close notifications"
              @click="emit('close')"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- Empty state -->
          <div class="flex flex-col items-center text-center px-4 py-8 text-ink-muted">
            <span class="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-surface-canvas mb-3">
              <BellOff class="h-5 w-5" />
            </span>
            <p class="text-[13px] font-medium font-sans text-ink-strong">
              You're all clear
            </p>
            <p class="text-xs mt-1 leading-relaxed font-sans max-w-[220px]">
              Mentions, prayer requests, and church updates will appear here.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .notif-panel-enter-active {
    transition:
      opacity 150ms ease,
      transform 150ms ease;
  }
  .notif-panel-leave-active {
    transition:
      opacity 100ms ease,
      transform 100ms ease;
  }
  .notif-panel-enter-from,
  .notif-panel-leave-to {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
</style>
