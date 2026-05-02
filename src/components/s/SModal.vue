<script setup lang="ts">
  import { onBeforeUnmount, onMounted, watch } from 'vue'
  import { X } from 'lucide-vue-next'
  import SIconButton from './SIconButton.vue'

  interface Props {
    open: boolean
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg'
    closeOnBackdrop?: boolean
  }

  const { open, size = 'md', closeOnBackdrop = true } = defineProps<Props>()
  const emit = defineEmits<{ close: [] }>()

  const sizeClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size]

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) emit('close')
  }

  watch(
    () => open,
    (v) => {
      if (typeof document !== 'undefined') document.body.style.overflow = v ? 'hidden' : ''
    },
    { immediate: true }
  )

  onMounted(() => document.addEventListener('keydown', onKey))
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKey)
    document.body.style.overflow = ''
  })
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="s-modal-backdrop z-modal flex items-center justify-center p-4"
        @click.self="closeOnBackdrop && emit('close')"
      >
        <div
          :class="[
            'w-full max-h-[calc(100vh-2rem)] rounded-xl bg-surface-base shadow-modal border border-line overflow-hidden flex flex-col',
            sizeClass,
          ]"
          role="dialog"
          aria-modal="true"
        >
          <header
            v-if="title || $slots.header"
            class="flex items-start justify-between gap-4 px-5 py-4 border-b border-line-subtle shrink-0"
          >
            <div class="min-w-0">
              <slot name="header">
                <h2 class="text-base font-semibold text-ink-strong">
                  {{ title }}
                </h2>
                <p v-if="description" class="text-sm text-ink-muted mt-0.5">
                  {{ description }}
                </p>
              </slot>
            </div>
            <SIconButton label="Close" size="sm" @click="emit('close')">
              <X class="h-4 w-4" />
            </SIconButton>
          </header>
          <div class="px-5 py-4 overflow-y-auto min-h-0">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="flex items-center justify-end gap-2 px-5 py-3 border-t border-line-subtle bg-surface-canvas shrink-0"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 160ms ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
