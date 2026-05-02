<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted } from 'vue'
  import { BookmarkPlus, StickyNote, X } from 'lucide-vue-next'

  interface VerseRef {
    book: string
    chapter: number
    verse: number
  }

  interface Props {
    x: number
    y: number
    verse: VerseRef | null
    currentHighlight?: string
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    highlight: [colorId: string]
    clearHighlight: []
    note: []
    save: []
    close: []
  }>()

  const COLORS = [
    { id: 'yellow', label: 'Yellow', bg: 'rgba(250, 204, 21, 0.55)' },
    { id: 'green', label: 'Green', bg: 'rgba(74, 222, 128, 0.55)' },
    { id: 'blue', label: 'Blue', bg: 'rgba(96, 165, 250, 0.55)' },
    { id: 'pink', label: 'Pink', bg: 'rgba(244, 114, 182, 0.55)' },
    { id: 'purple', label: 'Purple', bg: 'rgba(167, 139, 250, 0.55)' },
  ]

  const menuStyle = computed(() => {
    const menuW = 210
    const menuH = 240
    const left =
      typeof window !== 'undefined' && window.innerWidth - props.x < menuW
        ? props.x - menuW
        : props.x
    const top =
      typeof window !== 'undefined' && window.innerHeight - props.y < menuH
        ? props.y - menuH
        : props.y
    return { left: `${Math.max(4, left)}px`, top: `${Math.max(4, top)}px` }
  })

  function onDown() {
    emit('close')
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
  }

  onMounted(() => {
    setTimeout(() => {
      document.addEventListener('mousedown', onDown)
      document.addEventListener('keydown', onKey)
    }, 0)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onDown)
    document.removeEventListener('keydown', onKey)
  })
</script>

<template>
  <Teleport to="body">
    <Transition name="ctx-pop">
      <div
        v-if="verse"
        :style="{ position: 'fixed', zIndex: 9000, ...menuStyle }"
        class="min-w-[200px] rounded-xl border border-line bg-surface-overlay shadow-pop backdrop-blur-2xl p-1.5 text-sm"
        @mousedown.stop
      >
        <p
          class="px-2 pt-1 pb-1.5 text-[11px] font-semibold text-ink-subtle uppercase tracking-wide"
        >
          {{ verse.book }} {{ verse.chapter }}:{{ verse.verse }}
        </p>

        <div class="px-2 pb-2">
          <p class="text-[11px] text-ink-subtle mb-2">Highlight</p>
          <div class="flex items-center gap-1.5">
            <button
              v-for="c in COLORS"
              :key="c.id"
              class="h-[22px] w-[22px] rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              :style="{
                background: c.bg,
                boxShadow:
                  currentHighlight === c.id ? '0 0 0 2px #3b6bff' : '0 0 0 1.5px rgba(0,0,0,0.12)',
              }"
              :title="c.label"
              @click="emit('highlight', c.id)"
            />
          </div>
        </div>

        <div class="my-0.5 border-t border-line-subtle" />

        <button
          class="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-[13px] text-ink hover:bg-surface-canvas transition-colors"
          @click="emit('note')"
        >
          <StickyNote class="h-3.5 w-3.5 shrink-0 text-ink-muted" stroke-width="2" />
          Make a note
        </button>
        <button
          class="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-[13px] text-ink hover:bg-surface-canvas transition-colors"
          @click="emit('save')"
        >
          <BookmarkPlus class="h-3.5 w-3.5 shrink-0 text-ink-muted" stroke-width="2" />
          Save verse
        </button>

        <template v-if="currentHighlight">
          <div class="my-0.5 border-t border-line-subtle" />
          <button
            class="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-[13px] text-ink hover:bg-surface-canvas transition-colors"
            @click="emit('clearHighlight')"
          >
            <X class="h-3.5 w-3.5 shrink-0 text-ink-muted" stroke-width="2" />
            Remove highlight
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .ctx-pop-enter-active {
    transition:
      opacity 100ms ease,
      transform 100ms ease;
  }
  .ctx-pop-leave-active {
    transition:
      opacity 80ms ease,
      transform 80ms ease;
  }
  .ctx-pop-enter-from,
  .ctx-pop-leave-to {
    opacity: 0;
    transform: scale(0.96);
  }
</style>
