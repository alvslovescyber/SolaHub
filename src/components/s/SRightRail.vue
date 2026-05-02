<script setup lang="ts">
  import { X } from 'lucide-vue-next'
  import SIconButton from './SIconButton.vue'

  interface Props {
    open?: boolean
    title?: string
    closable?: boolean
    width?: string
  }

  const { open = true, closable = false, width = 'w-rail' } = defineProps<Props>()
  const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Transition name="rail">
    <aside
      v-if="open"
      :class="[
        'shrink-0 flex flex-col border-l border-line-subtle bg-surface-base overflow-hidden',
        width,
      ]"
    >
      <header
        v-if="title || $slots.header || closable"
        class="flex items-center justify-between px-4 h-topbar border-b border-line-subtle"
      >
        <div class="min-w-0">
          <slot name="header">
            <h3 class="text-sm font-semibold text-ink-strong truncate">
              {{ title }}
            </h3>
          </slot>
        </div>
        <SIconButton
          v-if="closable"
          label="Close"
          size="sm"
          @click="emit('close')"
        >
          <X class="h-4 w-4" />
        </SIconButton>
      </header>

      <div class="flex-1 overflow-y-auto">
        <slot />
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
  .rail-enter-active,
  .rail-leave-active {
    transition:
      width 220ms ease,
      opacity 220ms ease;
    overflow: hidden;
  }
  .rail-enter-from,
  .rail-leave-to {
    width: 0;
    opacity: 0;
  }
</style>
