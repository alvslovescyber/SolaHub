<script setup lang="ts">
  import { X } from 'lucide-vue-next'
  import { useUiStore } from '@/stores/ui.store'

  const ui = useUiStore()
</script>

<template>
  <Transition name="slide-panel">
    <aside
      v-if="ui.contextPanelOpen"
      class="w-[320px] shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
    >
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700"
      >
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
          <slot name="title">
            Context
          </slot>
        </h3>
        <button
          class="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          @click="ui.toggleContextPanel()"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <slot />
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
  .slide-panel-enter-active,
  .slide-panel-leave-active {
    transition:
      width 200ms ease,
      opacity 200ms ease;
    overflow: hidden;
  }

  .slide-panel-enter-from,
  .slide-panel-leave-to {
    width: 0;
    opacity: 0;
  }
</style>
