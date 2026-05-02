<script setup lang="ts">
  import { onMounted, onBeforeUnmount } from 'vue'
  import { X } from 'lucide-vue-next'
  import SBrandMark from './SBrandMark.vue'

  defineProps<{ open: boolean }>()
  const emit = defineEmits<{ close: [] }>()

  type ChangeType = 'feature' | 'improvement' | 'fix'

  const releases = [
    {
      version: '1.0.0',
      date: 'May 2025',
      isLatest: true,
      changes: [
        {
          type: 'feature' as ChangeType,
          text: 'Full KJV Bible reader with chapter navigation and offline support',
        },
        {
          type: 'feature' as ChangeType,
          text: 'Reading plans — create, publish, share, and track daily progress',
        },
        {
          type: 'feature' as ChangeType,
          text: 'Verse journal with tags, filtering, and Scripture linking',
        },
        {
          type: 'feature' as ChangeType,
          text: 'Sunday Presenter with dual-screen display and slide builder',
        },
        {
          type: 'feature' as ChangeType,
          text: 'Church community plans shared across your congregation',
        },
        { type: 'feature' as ChangeType, text: 'Live collaboration for church teams' },
        {
          type: 'improvement' as ChangeType,
          text: "Dashboard with reading stats, today's plan, and quick access",
        },
        {
          type: 'improvement' as ChangeType,
          text: 'Command palette (⌘K) for instant navigation across the app',
        },
        { type: 'improvement' as ChangeType, text: 'Dark mode support' },
      ],
    },
    {
      version: '0.9.0',
      date: 'March 2025',
      isLatest: false,
      changes: [
        { type: 'feature' as ChangeType, text: 'Initial beta release of the Bible reader' },
        {
          type: 'feature' as ChangeType,
          text: 'Reading plan scaffolding with draft and publish support',
        },
        { type: 'feature' as ChangeType, text: 'User accounts, registration, and profile setup' },
        { type: 'improvement' as ChangeType, text: 'Native desktop app for macOS and Windows' },
        { type: 'fix' as ChangeType, text: 'Reliable offline access for Bible reading' },
      ],
    },
  ]

  const typeConfig: Record<ChangeType, { label: string; dot: string; badge: string }> = {
    feature: {
      label: 'New',
      dot: 'bg-brand-500',
      badge: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    },
    improvement: {
      label: 'Improved',
      dot: 'bg-violet-500',
      badge: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    },
    fix: {
      label: 'Fixed',
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
  }

  onMounted(() => document.addEventListener('keydown', onKey))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="rn-fade">
      <div
        v-if="open"
        class="s-modal-backdrop z-modal flex items-center justify-center p-6"
        @click.self="emit('close')"
      >
        <div
          class="w-full max-w-[520px] max-h-[580px] bg-surface-base rounded-2xl shadow-2xl overflow-hidden border border-line flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Release notes"
        >
          <!-- Header -->
          <header
            class="flex items-center justify-between px-5 h-11 border-b border-line-subtle bg-surface-canvas shrink-0"
          >
            <div class="flex items-center gap-2">
              <SBrandMark :size="18" />
              <span class="text-sm font-semibold text-ink-strong">Release Notes</span>
            </div>
            <button
              class="h-7 w-7 rounded-md hover:bg-surface-sunken transition-colors flex items-center justify-center text-ink-muted hover:text-ink"
              aria-label="Close"
              @click="emit('close')"
            >
              <X class="h-4 w-4" />
            </button>
          </header>

          <!-- Releases -->
          <div class="flex-1 overflow-y-auto px-5 py-5 space-y-7">
            <section v-for="release in releases" :key="release.version">
              <!-- Version header -->
              <div class="flex items-center gap-2.5 mb-4">
                <h3 class="text-[13px] font-bold text-ink-strong tracking-tight">
                  v{{ release.version }}
                </h3>
                <span
                  v-if="release.isLatest"
                  class="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 leading-none"
                >
                  Latest
                </span>
                <span
                  v-else
                  class="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-surface-sunken text-ink-subtle leading-none"
                >
                  Beta
                </span>
                <span class="text-xs text-ink-subtle ml-auto">{{ release.date }}</span>
              </div>

              <!-- Change list -->
              <ul class="space-y-2.5">
                <li
                  v-for="change in release.changes"
                  :key="change.text"
                  class="flex items-start gap-3"
                >
                  <span
                    :class="[
                      'mt-[7px] shrink-0 h-1.5 w-1.5 rounded-full',
                      typeConfig[change.type].dot,
                    ]"
                  />
                  <div class="flex items-start gap-2 min-w-0">
                    <span
                      :class="[
                        'shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 leading-none uppercase tracking-[0.04em]',
                        typeConfig[change.type].badge,
                      ]"
                    >
                      {{ typeConfig[change.type].label }}
                    </span>
                    <span class="text-[13px] text-ink-muted leading-relaxed">{{
                      change.text
                    }}</span>
                  </div>
                </li>
              </ul>

              <!-- Divider between releases -->
              <div v-if="!release.isLatest" class="mt-7 border-t border-line-subtle" />
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .rn-fade-enter-active,
  .rn-fade-leave-active {
    transition: opacity 200ms ease;
  }
  .rn-fade-enter-from,
  .rn-fade-leave-to {
    opacity: 0;
  }
</style>
