<script setup lang="ts">
  import { computed, ref, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    Search,
    LayoutDashboard,
    BookOpenText,
    CalendarDays,
    StickyNote,
    Monitor,
    Users,
    Settings,
    Inbox,
    type LucideIcon,
  } from 'lucide-vue-next'

  interface Command {
    id: string
    label: string
    hint?: string
    icon: LucideIcon
    routeName?: string
    action?: () => void
  }

  interface Props {
    open: boolean
  }

  const { open } = defineProps<Props>()
  const emit = defineEmits<{ close: [] }>()

  const router = useRouter()
  const query = ref('')
  const inputRef = ref<HTMLInputElement | null>(null)
  const activeIndex = ref(0)

  const commands: Command[] = [
    { id: 'go-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, routeName: 'dashboard' },
    { id: 'go-bible', label: 'Open Bible', icon: BookOpenText, routeName: 'bible' },
    { id: 'go-plans', label: 'Reading Plans', icon: CalendarDays, routeName: 'plans' },
    { id: 'go-notes', label: 'Notations', icon: StickyNote, routeName: 'notes' },
    { id: 'go-presenter', label: 'Presenter', icon: Monitor, routeName: 'presenter' },
    { id: 'go-community', label: 'Community', icon: Users, routeName: 'community' },
    { id: 'go-inbox', label: 'Inbox', icon: Inbox, routeName: 'inbox' },
    { id: 'go-settings', label: 'Settings', icon: Settings, routeName: 'settings' },
  ]

  const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  })

  function run(cmd: Command) {
    if (cmd.routeName) void router.push({ name: cmd.routeName })
    cmd.action?.()
    emit('close')
  }

  function onKey(event: KeyboardEvent) {
    if (!open) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      activeIndex.value = Math.min(activeIndex.value + 1, filtered.value.length - 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      activeIndex.value = Math.max(activeIndex.value - 1, 0)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const cmd = filtered.value[activeIndex.value]
      if (cmd) run(cmd)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      emit('close')
    }
  }

  watch(
    () => open,
    async (v) => {
      if (v) {
        query.value = ''
        activeIndex.value = 0
        await nextTick()
        inputRef.value?.focus()
      }
    }
  )

  watch(query, () => (activeIndex.value = 0))

  onMounted(() => document.addEventListener('keydown', onKey))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="s-modal-backdrop z-modal flex items-start justify-center pt-[15vh] px-4"
        @click.self="emit('close')"
      >
        <div
          class="w-full max-w-lg rounded-xl border border-line bg-surface-overlay shadow-modal overflow-hidden backdrop-blur-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-line-subtle">
            <Search class="h-4 w-4 text-ink-muted" />
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              placeholder="Type a command or search…"
              class="flex-1 bg-transparent text-sm text-ink-strong placeholder:text-ink-subtle focus:outline-none"
            />
          </div>
          <ul v-if="filtered.length > 0" class="max-h-[320px] overflow-y-auto py-1.5">
            <li v-for="(cmd, index) in filtered" :key="cmd.id">
              <button
                type="button"
                :class="[
                  'flex items-center gap-3 w-full text-left px-3 py-2 text-sm transition-colors',
                  index === activeIndex
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'text-ink hover:bg-surface-canvas',
                ]"
                @click="run(cmd)"
                @mouseenter="activeIndex = index"
              >
                <component :is="cmd.icon" class="h-4 w-4 shrink-0" />
                <span class="flex-1 truncate">{{ cmd.label }}</span>
                <span v-if="cmd.hint" class="text-2xs text-ink-subtle">{{ cmd.hint }}</span>
              </button>
            </li>
          </ul>
          <div v-else class="px-3 py-6 text-center text-sm text-ink-muted">No results</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 140ms ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
