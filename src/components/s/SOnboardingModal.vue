<script setup lang="ts">
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
  import {
    BookOpenText,
    CalendarDays,
    StickyNote,
    Monitor,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    X,
    Check,
  } from 'lucide-vue-next'
  import SButton from './SButton.vue'
  import SBrandMark from './SBrandMark.vue'

  defineProps<{ open: boolean }>()
  const emit = defineEmits<{ close: [] }>()

  const step = ref(0)
  const direction = ref<'forward' | 'back'>('forward')

  const steps = [
    {
      id: 'welcome',
      iconBg: 'bg-gradient-to-br from-sun-400 to-sun-500',
      icon: null,
      title: 'Welcome to SolaHub',
      description:
        "Everything you need to study God's Word — Bible reading, journaling, reading plans, and Sunday presentations — all in one place.",
      features: null,
    },
    {
      id: 'bible',
      iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
      icon: BookOpenText,
      title: 'Read & Study Scripture',
      description:
        'Navigate any book, chapter, or verse instantly. Search passages across the entire Bible and write notes tied directly to the text.',
      features: ['Full KJV Bible, works offline', 'Instant full-text search', 'Verse-linked annotations'],
    },
    {
      id: 'plans',
      iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
      icon: CalendarDays,
      title: 'Reading Plans',
      description:
        'Build a structured reading schedule or join a plan created by your pastor. Track daily progress and read alongside your congregation.',
      features: ['Create custom schedules', 'Join church-wide plans', 'Daily progress tracking'],
    },
    {
      id: 'journal',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      icon: StickyNote,
      title: 'Verse Journal',
      description:
        'Write reflections anchored to any verse. Organize notes with tags, choose what to share with your church, and revisit insights over time.',
      features: ['Linked to specific verses', 'Tags & rich search', 'Private or shareable'],
    },
    {
      id: 'presenter',
      iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600',
      icon: Monitor,
      title: 'Sunday Presenter',
      description:
        'Project Bible passages onto any connected display. Build slide decks from your reading plans and control the presentation from one window.',
      features: ['Dual-screen display', 'Slide builder from plans', 'Keyboard & remote control'],
    },
    {
      id: 'ready',
      iconBg: 'bg-gradient-to-br from-sun-400 to-sun-600',
      icon: Sparkles,
      title: "You're all set",
      description:
        "Your study environment is ready. Open the Bible to start reading, create a plan to stay on track, or launch the Presenter for Sunday.",
      features: null,
    },
  ]

  const current = computed(() => steps[step.value])
  const isFirst = computed(() => step.value === 0)
  const isLast = computed(() => step.value === steps.length - 1)
  const transitionName = computed(() =>
    direction.value === 'forward' ? 'ob-slide-fwd' : 'ob-slide-back'
  )

  function goTo(i: number) {
    direction.value = i > step.value ? 'forward' : 'back'
    step.value = i
  }

  function next() {
    direction.value = 'forward'
    if (!isLast.value) step.value++
  }

  function prev() {
    direction.value = 'back'
    if (!isFirst.value) step.value--
  }

  function close() {
    step.value = 0
    emit('close')
  }

  function onKey(e: KeyboardEvent) {
    if (!document.querySelector('[data-onboarding]')) return
    if (e.key === 'Escape') close()
    if (e.key === 'ArrowRight') next()
    if (e.key === 'ArrowLeft') prev()
  }

  onMounted(() => document.addEventListener('keydown', onKey))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="ob-backdrop">
      <div
        v-if="open"
        class="s-modal-backdrop z-modal flex items-center justify-center p-6"
        data-onboarding
        @click.self="close"
      >
        <Transition
          name="ob-enter"
          appear
        >
          <div
            v-if="open"
            class="w-full max-w-[440px] bg-surface-base rounded-2xl shadow-2xl border border-line overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <!-- Top bar: progress + close -->
            <div class="flex items-center gap-3 px-5 pt-4 pb-0">
              <div class="flex flex-1 items-center gap-1">
                <button
                  v-for="(s, i) in steps"
                  :key="s.id"
                  :aria-label="`Step ${i + 1}`"
                  class="flex-1 h-[3px] rounded-full transition-all duration-300"
                  :class="[i <= step ? 'bg-ink-strong' : 'bg-line']"
                  @click="goTo(i)"
                />
              </div>
              <button
                class="h-6 w-6 rounded-full bg-surface-sunken hover:bg-surface-canvas transition-colors flex items-center justify-center text-ink-muted hover:text-ink shrink-0"
                aria-label="Close"
                @click="close"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>

            <!-- Content -->
            <div class="px-6 pt-6 pb-2 min-h-[290px]">
              <Transition
                :name="transitionName"
                mode="out-in"
              >
                <div
                  :key="current.id"
                  class="flex flex-col"
                >
                  <!-- App-style icon -->
                  <div
                    :class="[
                      'h-14 w-14 rounded-[14px] flex items-center justify-center mb-5 shadow-sm',
                      current.iconBg,
                    ]"
                  >
                    <SBrandMark
                      v-if="current.id === 'welcome'"
                      :size="28"
                    />
                    <component
                      v-else
                      :is="current.icon"
                      class="h-7 w-7 text-white drop-shadow-sm"
                    />
                  </div>

                  <!-- Title -->
                  <h2
                    class="text-[22px] font-bold text-ink-strong leading-tight tracking-tight"
                  >
                    {{ current.title }}
                  </h2>

                  <!-- Description -->
                  <p class="mt-2.5 text-[14px] text-ink-muted leading-relaxed">
                    {{ current.description }}
                  </p>

                  <!-- Features -->
                  <ul
                    v-if="current.features"
                    class="mt-5 space-y-2.5"
                  >
                    <li
                      v-for="f in current.features"
                      :key="f"
                      class="flex items-center gap-2.5"
                    >
                      <span
                        class="shrink-0 h-[18px] w-[18px] rounded-full bg-surface-sunken text-ink inline-flex items-center justify-center"
                      >
                        <Check class="h-2.5 w-2.5" />
                      </span>
                      <span class="text-[13px] text-ink font-medium">{{ f }}</span>
                    </li>
                  </ul>
                </div>
              </Transition>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between px-6 pb-6 pt-4">
              <SButton
                v-if="!isFirst"
                variant="ghost"
                size="sm"
                @click="prev"
              >
                <template #leading>
                  <ChevronLeft class="h-3.5 w-3.5" />
                </template>
                Back
              </SButton>
              <div v-else />

              <div class="flex items-center gap-2">
                <span class="text-[11px] text-ink-subtle tabular-nums">
                  {{ step + 1 }} / {{ steps.length }}
                </span>
                <SButton
                  v-if="!isLast"
                  variant="primary"
                  size="sm"
                  @click="next"
                >
                  Continue
                  <template #trailing>
                    <ChevronRight class="h-3.5 w-3.5" />
                  </template>
                </SButton>
                <SButton
                  v-else
                  variant="primary"
                  size="sm"
                  @click="close"
                >
                  Get started
                </SButton>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .ob-backdrop-enter-active,
  .ob-backdrop-leave-active {
    transition: opacity 180ms ease;
  }
  .ob-backdrop-enter-from,
  .ob-backdrop-leave-to {
    opacity: 0;
  }

  .ob-enter-enter-active {
    transition: all 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .ob-enter-enter-from {
    opacity: 0;
    transform: scale(0.97) translateY(8px);
  }

  /* Forward: content slides in from right */
  .ob-slide-fwd-enter-active,
  .ob-slide-fwd-leave-active {
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ob-slide-fwd-enter-from {
    opacity: 0;
    transform: translateX(16px);
  }
  .ob-slide-fwd-leave-to {
    opacity: 0;
    transform: translateX(-16px);
  }

  /* Back: content slides in from left */
  .ob-slide-back-enter-active,
  .ob-slide-back-leave-active {
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ob-slide-back-enter-from {
    opacity: 0;
    transform: translateX(-16px);
  }
  .ob-slide-back-leave-to {
    opacity: 0;
    transform: translateX(16px);
  }
</style>
