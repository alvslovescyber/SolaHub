<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { RouterLink } from 'vue-router'
  import {
    BookOpenText,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    HelpCircle,
    Monitor,
    BookMarked,
    ScrollText,
    Sparkles,
    StickyNote,
  } from 'lucide-vue-next'
  import { useAuthStore } from '@/stores/auth.store'
  import { useNotesStore } from '@/stores/notes.store'
  import { usePlansStore } from '@/stores/plans.store'
  import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
  import { useActivityFeed } from '@/composables/useActivityFeed'
  import { formatActivityTime } from '@/utils/formatTime'
  import {
    SBadge,
    SBrandMark,
    SButton,
    SCard,
    SDocumentationModal,
    SEmptyState,
    SOnboardingModal,
    SPageContainer,
    SPageTabs,
    SReleaseNotesModal,
    SRightRail,
    SSpinner,
    STopBar,
  } from '@/components/s'

  const showOnboarding = ref(false)
  const showDocs = ref(false)
  const showReleaseNotes = ref(false)

  const auth = useAuthStore()
  const notes = useNotesStore()
  const plans = usePlansStore()
  const { isCompact } = useResponsiveLayout()
  const { feed: activityFeed, grouped: groupedActivity, isLoading: activityLoading } = useActivityFeed()

  const greeting = computed(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  })

  const tab = ref<'home' | 'reading' | 'activity'>('home')
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'reading', label: 'Reading' },
    { id: 'activity', label: 'Activity' },
  ] as const

  const stats = computed(() => [
    { label: 'Notes', value: notes.notes.length },
    { label: 'Active plans', value: plans.activePlans.length },
    { label: 'Drafts', value: plans.draftPlans.length },
  ])

  // ── Today card ────────────────────────────────────────────────────────────────
  const _now = new Date()
  const todayDateNum = _now.getDate()
  const todayMonth = _now.toLocaleString('default', { month: 'short' }).toUpperCase()
  const todayDayName = _now.toLocaleString('default', { weekday: 'long' })
  const isSunday = _now.getDay() === 0

  const sundayCountdown = (() => {
    const day = _now.getDay()
    if (day === 0) return 'Blessings on your service today'
    if (day === 6) return 'Tomorrow is Sunday — preparing?'
    const daysLeft = 7 - day
    return `${daysLeft} day${daysLeft !== 1 ? 's' : ''} until Sunday`
  })()

  const plansStatusLine = computed(() => {
    if (plans.isLoading) return 'Loading your reading plans…'
    const count = plans.activePlans.length
    if (count === 0) return 'No active reading plans yet — start one to build a daily habit'
    return `${count} active reading plan${count !== 1 ? 's' : ''} in progress`
  })

  // ── Setup guide accordion ─────────────────────────────────────────────────────
  const GUIDE_KEY = 'solahub:setup-guide'

  interface GuideState {
    dismissed: boolean
    skipped: string[]
  }

  function loadGuide(): GuideState {
    try {
      const raw = localStorage.getItem(GUIDE_KEY)
      if (!raw) return { dismissed: false, skipped: [] }
      return JSON.parse(raw) as GuideState
    } catch {
      return { dismissed: false, skipped: [] }
    }
  }

  function saveGuide(state: GuideState): void {
    localStorage.setItem(GUIDE_KEY, JSON.stringify(state))
  }

  const setupSteps = [
    {
      id: 'profile',
      title: 'Set up your profile',
      desc: 'Add your display name so your church family knows who you are.',
      route: { name: 'settings' as const },
      cta: 'Open settings',
    },
    {
      id: 'plan',
      title: 'Begin a reading plan',
      desc: 'Walk through Scripture day-by-day, on your own or with friends. You can build your own or join one.',
      route: { name: 'plans' as const },
      cta: 'Browse plans',
    },
    {
      id: 'invite',
      title: 'Invite your congregation',
      desc: 'Share verse notes, reading plans, and Sunday slides with your church community.',
      route: { name: 'community' as const },
      cta: 'View community',
    },
  ] as const

  const stepDoneMap = computed<Record<string, boolean>>(() => ({
    profile: !!(auth.user?.displayName),
    plan: plans.plans.length > 0,
    invite: !!(auth.user?.churchId),
  }))

  const guide = ref<GuideState>(loadGuide())
  const openStepId = ref<string | null>(
    setupSteps.find((s) => !loadGuide().skipped.includes(s.id) && !stepDoneMap.value[s.id])?.id ?? null
  )

  const remainingStepCount = computed(
    () => setupSteps.filter((s) => !guide.value.skipped.includes(s.id) && !stepDoneMap.value[s.id]).length
  )

  function toggleStep(id: string): void {
    openStepId.value = openStepId.value === id ? null : id
  }

  function skipStep(id: string): void {
    guide.value = {
      ...guide.value,
      skipped: [...new Set([...guide.value.skipped, id])],
    }
    saveGuide(guide.value)
    openStepId.value =
      setupSteps.find((s) => !guide.value.skipped.includes(s.id))?.id ?? null
  }

  function dismissGuide(): void {
    guide.value = { ...guide.value, dismissed: true }
    saveGuide(guide.value)
  }

  onMounted(async () => {
    await Promise.all([notes.fetchMyNotes(), plans.fetchMyPlans()])
  })
</script>

<template>
  <div class="flex flex-1 min-w-0">
    <div class="flex flex-1 flex-col min-w-0">
      <STopBar
        :title="`${greeting}, ${auth.user?.displayName ?? 'friend'}`"
        subtitle="Open the Word and pick up where you left off"
      >
        <template #actions>
          <RouterLink
            :to="{ name: 'bible' }"
            class="no-underline hover:no-underline"
          >
            <SButton
              size="sm"
              variant="primary"
            >
              <template #leading>
                <BookMarked class="h-3.5 w-3.5" />
              </template>
              Open Bible
            </SButton>
          </RouterLink>
        </template>
      </STopBar>

      <SPageTabs
        v-model="tab"
        :tabs="tabs"
      />

      <SPageContainer
        max="2xl"
        padding="lg"
      >

        <!-- ── Today card ── -->
        <section
          v-if="tab === 'home'"
          class="mb-6"
        >
          <div class="flex gap-4 items-stretch rounded-xl border border-line bg-surface-raised px-5 py-4">
            <!-- Date badge -->
            <div
              :class="[
                'flex flex-col items-center justify-center w-14 shrink-0 rounded-lg py-3 gap-0.5',
                isSunday
                  ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
                  : 'bg-surface-canvas text-ink-strong',
              ]"
            >
              <span class="text-[26px] font-bold leading-none tabular-nums">{{ todayDateNum }}</span>
              <span class="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">{{ todayMonth }}</span>
            </div>

            <!-- Status column -->
            <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <p class="text-[14px] font-semibold text-ink-strong leading-tight">
                {{ isSunday ? 'Sunday 🙌' : todayDayName }}
              </p>
              <p
                :class="[
                  'text-xs font-medium',
                  isSunday ? 'text-brand-600 dark:text-brand-400' : 'text-ink-muted',
                ]"
              >
                {{ sundayCountdown }}
              </p>
              <div class="mt-2.5 pt-2.5 border-t border-line-subtle">
                <p class="text-[11px] text-ink-subtle leading-snug">
                  {{ plansStatusLine }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Setup guide (accordion) ── -->
        <section
          v-if="tab === 'home' && !guide.dismissed"
          class="mb-6"
        >
          <div class="flex items-baseline justify-between mb-3">
            <div>
              <h2 class="text-[13px] font-semibold text-ink-strong">
                Get started
              </h2>
              <p class="text-xs text-ink-muted mt-0.5">
                {{ remainingStepCount === 0 ? 'All steps complete' : `${remainingStepCount} of ${setupSteps.length} steps remaining` }}
              </p>
            </div>
            <button
              class="text-xs text-ink-subtle hover:text-ink-muted transition-colors"
              @click="dismissGuide"
            >
              Skip setup
            </button>
          </div>

          <SCard padding="none">
            <div
              v-for="(step, idx) in setupSteps"
              :key="step.id"
              class="border-b border-line-subtle last:border-b-0"
            >
              <!-- Step header -->
              <button
                class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-canvas transition-colors text-left"
                @click="toggleStep(step.id)"
              >
                <span class="shrink-0">
                  <CheckCircle2
                    v-if="stepDoneMap[step.id] || guide.skipped.includes(step.id)"
                    class="h-[18px] w-[18px] text-brand-500"
                  />
                  <span
                    v-else
                    class="h-[18px] w-[18px] rounded-full border-2 border-line flex items-center justify-center text-[10px] font-bold text-ink-subtle"
                  >{{ idx + 1 }}</span>
                </span>
                <span
                  :class="[
                    'flex-1 text-[13px] font-medium',
                    stepDoneMap[step.id] || guide.skipped.includes(step.id) ? 'text-ink-subtle line-through' : 'text-ink-strong',
                  ]"
                >{{ step.title }}</span>
                <ChevronDown
                  :class="[
                    'h-3.5 w-3.5 text-ink-subtle shrink-0 transition-transform duration-200',
                    openStepId === step.id && !guide.skipped.includes(step.id) ? 'rotate-180' : '',
                  ]"
                />
              </button>

              <!-- Expanded body -->
              <Transition name="guide-step">
                <div
                  v-if="openStepId === step.id && !stepDoneMap[step.id] && !guide.skipped.includes(step.id)"
                  class="pl-[52px] pr-4 pb-4"
                >
                  <p class="text-xs text-ink-muted leading-relaxed mb-3">
                    {{ step.desc }}
                  </p>
                  <div class="flex items-center gap-3">
                    <RouterLink
                      :to="step.route"
                      class="no-underline hover:no-underline"
                    >
                      <SButton
                        size="sm"
                        variant="primary"
                      >
                        {{ step.cta }}
                      </SButton>
                    </RouterLink>
                    <button
                      class="text-xs text-ink-muted hover:text-ink transition-colors"
                      @click.stop="skipStep(step.id)"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </SCard>
        </section>

        <!-- ── Overview stats ── -->
        <section
          v-if="tab === 'home'"
          class="mb-7"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-subtle mb-3">
            Overview
          </p>
          <div class="grid grid-cols-3 gap-3">
            <article
              v-for="stat in stats"
              :key="stat.label"
              class="rounded-xl border border-line bg-surface-raised p-4"
            >
              <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-subtle">
                {{ stat.label }}
              </p>
              <p class="text-[28px] font-bold text-ink-strong mt-1 leading-none tracking-tight tabular-nums">
                {{ stat.value }}
              </p>
            </article>
          </div>
        </section>

        <!-- ── Today's reading / Reading tab ── -->
        <section
          v-if="tab === 'home' || tab === 'reading'"
          class="mb-7"
        >
          <div class="flex items-baseline justify-between mb-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-subtle">
                {{ tab === 'reading' ? 'Your reading plans' : 'Today' }}
              </p>
              <p class="text-xs text-ink-muted mt-0.5">
                {{
                  tab === 'reading'
                    ? 'Every plan you have started or joined'
                    : 'Where you are in each plan'
                }}
              </p>
            </div>
            <RouterLink
              to="/plans"
              class="text-xs text-brand-600 font-medium hover:underline"
            >
              View all
            </RouterLink>
          </div>

          <SSpinner
            v-if="plans.isLoading"
            size="sm"
          />

          <SCard
            v-else-if="plans.plans.length === 0"
            padding="none"
          >
            <SEmptyState
              title="No reading plans yet"
              description="Pick a plan or build your own to start walking through Scripture."
            >
              <template #icon>
                <CalendarDays class="h-5 w-5" />
              </template>
              <template #actions>
                <RouterLink
                  to="/plans"
                  class="no-underline hover:no-underline"
                >
                  <SButton
                    size="sm"
                    variant="primary"
                  >
                    Create a plan
                  </SButton>
                </RouterLink>
              </template>
            </SEmptyState>
          </SCard>

          <SCard
            v-else
            padding="none"
          >
            <RouterLink
              v-for="plan in plans.plans.slice(0, 5)"
              :key="plan.id"
              :to="{ name: 'plan-detail', params: { id: plan.id } }"
              class="group flex items-center justify-between px-4 py-3 border-b border-line-subtle last:border-b-0 hover:bg-surface-canvas transition-colors no-underline hover:no-underline"
            >
              <div class="flex items-center gap-3 min-w-0">
                <CalendarDays class="h-4 w-4 shrink-0 text-ink-muted" />
                <div class="min-w-0">
                  <p class="text-[13px] font-medium text-ink-strong truncate">
                    {{ plan.title }}
                  </p>
                  <p class="text-xs text-ink-muted">
                    {{ plan.participants.length }} participant{{
                      plan.participants.length !== 1 ? 's' : ''
                    }}
                    · {{ plan.days.length }} day{{ plan.days.length !== 1 ? 's' : '' }}
                  </p>
                </div>
              </div>
              <SBadge
                :tone="
                  plan.status === 'Active'
                    ? 'success'
                    : plan.status === 'Draft'
                      ? 'neutral'
                      : 'warning'
                "
                variant="soft"
                dot
              >
                {{ plan.status }}
              </SBadge>
            </RouterLink>
          </SCard>
          <p
            v-if="plans.plans.length > 5"
            class="mt-2 text-xs text-ink-subtle text-right"
          >
            Showing 5 of {{ plans.plans.length }} —
            <RouterLink to="/plans" class="text-brand-600 font-medium hover:underline">view all</RouterLink>
          </p>
        </section>

        <!-- ── Activity feed ── -->
        <section
          v-if="tab === 'activity'"
          class="mt-2"
        >
          <SSpinner
            v-if="activityLoading"
            size="sm"
          />

          <SCard
            v-else-if="activityFeed.length === 0"
            padding="none"
          >
            <SEmptyState
              title="No activity yet"
              description="Write a verse note, join a reading plan, or mark daily reading to see your history here."
            >
              <template #icon>
                <Sparkles class="h-5 w-5" />
              </template>
            </SEmptyState>
          </SCard>

          <div
            v-else
            class="space-y-6"
          >
            <div
              v-for="group in groupedActivity"
              :key="group.label"
            >
              <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle mb-2 px-1">
                {{ group.label }}
              </p>
              <SCard padding="none">
                <RouterLink
                  v-for="event in group.events"
                  :key="event.id"
                  :to="event.route ?? '/'"
                  class="flex items-start gap-3 px-4 py-3 border-b border-line-subtle last:border-b-0 hover:bg-surface-canvas transition-colors no-underline hover:no-underline"
                >
                  <span
                    :class="[
                      'mt-0.5 h-8 w-8 shrink-0 rounded-md inline-flex items-center justify-center',
                      event.iconBg,
                      event.iconColor,
                    ]"
                  >
                    <component
                      :is="event.icon"
                      class="h-4 w-4"
                    />
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-medium text-ink-strong leading-snug">
                      {{ event.label }}
                    </p>
                    <p
                      v-if="event.detail"
                      class="text-xs text-ink-muted mt-0.5 line-clamp-1"
                    >
                      {{ event.detail }}
                    </p>
                  </div>
                  <span class="text-[11px] text-ink-subtle shrink-0 mt-0.5 ml-2 tabular-nums">
                    {{ formatActivityTime(event.timestamp) }}
                  </span>
                </RouterLink>
              </SCard>
            </div>
          </div>
        </section>

        <!-- ── Quick access — 4-item icon grid ── -->
        <section
          v-if="tab === 'home'"
          class="mt-1 mb-6"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-subtle mb-3">
            Quick access
          </p>
          <div class="grid grid-cols-2 gap-2.5">
            <RouterLink
              to="/bible"
              class="block no-underline hover:no-underline"
            >
              <SCard
                hoverable
                padding="sm"
                class="h-full"
              >
                <div class="flex items-center gap-3">
                  <span class="h-8 w-8 shrink-0 rounded-lg bg-brand-500/10 dark:bg-brand-500/15 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <BookOpenText class="h-[15px] w-[15px]" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-[13px] font-semibold text-ink-strong leading-tight">Open Bible</p>
                    <p class="text-[11px] text-ink-muted mt-0.5">Read & search</p>
                  </div>
                </div>
              </SCard>
            </RouterLink>

            <RouterLink
              to="/notes"
              class="block no-underline hover:no-underline"
            >
              <SCard
                hoverable
                padding="sm"
                class="h-full"
              >
                <div class="flex items-center gap-3">
                  <span class="h-8 w-8 shrink-0 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <StickyNote class="h-[15px] w-[15px]" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-[13px] font-semibold text-ink-strong leading-tight">Journal</p>
                    <p class="text-[11px] text-ink-muted mt-0.5">Verse reflections</p>
                  </div>
                </div>
              </SCard>
            </RouterLink>

            <RouterLink
              to="/plans"
              class="block no-underline hover:no-underline"
            >
              <SCard
                hoverable
                padding="sm"
                class="h-full"
              >
                <div class="flex items-center gap-3">
                  <span class="h-8 w-8 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CalendarDays class="h-[15px] w-[15px]" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-[13px] font-semibold text-ink-strong leading-tight">Reading plans</p>
                    <p class="text-[11px] text-ink-muted mt-0.5">Browse & manage</p>
                  </div>
                </div>
              </SCard>
            </RouterLink>

            <RouterLink
              to="/presenter"
              class="block no-underline hover:no-underline"
            >
              <SCard
                hoverable
                padding="sm"
                class="h-full"
              >
                <div class="flex items-center gap-3">
                  <span class="h-8 w-8 shrink-0 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                    <Monitor class="h-[15px] w-[15px]" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-[13px] font-semibold text-ink-strong leading-tight">Presenter</p>
                    <p class="text-[11px] text-ink-muted mt-0.5">Sunday display</p>
                  </div>
                </div>
              </SCard>
            </RouterLink>
          </div>
        </section>

      </SPageContainer>
    </div>

    <!-- ── Right rail ── -->
    <SRightRail
      v-if="!isCompact"
      title="Help & resources"
    >
      <div class="px-4 pt-3 pb-4 space-y-5">
        <div class="flex items-start gap-2.5">
          <SBrandMark
            :size="18"
            class="shrink-0 mt-0.5"
          />
          <div class="min-w-0">
            <p class="text-[13px] font-semibold text-ink-strong leading-tight">
              SolaHub guide
            </p>
            <p class="text-[12px] text-ink-muted mt-0.5 leading-snug">
              A clickthrough tour of all features
            </p>
            <button
              class="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
              @click="showOnboarding = true"
            >
              <Sparkles class="h-3 w-3" />
              Start tour
            </button>
          </div>
        </div>

        <div class="border-t border-line-subtle" />

        <div class="space-y-0.5">
          <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-subtle px-1 pb-1">
            Resources
          </p>
          <button
            class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[13px] text-ink hover:bg-surface-canvas transition-colors text-left"
            @click="showDocs = true"
          >
            <span class="flex items-center gap-2">
              <HelpCircle class="h-3.5 w-3.5 text-ink-muted" />
              Documentation
            </span>
            <ChevronRight class="h-3 w-3 text-ink-subtle" />
          </button>
          <button
            class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[13px] text-ink hover:bg-surface-canvas transition-colors text-left"
            @click="showReleaseNotes = true"
          >
            <span class="flex items-center gap-2">
              <ScrollText class="h-3.5 w-3.5 text-ink-muted" />
              Release notes
            </span>
            <ChevronRight class="h-3 w-3 text-ink-subtle" />
          </button>
        </div>
      </div>
    </SRightRail>

    <!-- Modals -->
    <SOnboardingModal
      :open="showOnboarding"
      @close="showOnboarding = false"
    />
    <SDocumentationModal
      :open="showDocs"
      @close="showDocs = false"
    />
    <SReleaseNotesModal
      :open="showReleaseNotes"
      @close="showReleaseNotes = false"
    />
  </div>
</template>

<style scoped>
.guide-step-enter-active {
  transition:
    max-height 0.2s ease,
    opacity 0.15s ease;
  max-height: 200px;
  overflow: hidden;
}
.guide-step-leave-active {
  transition:
    max-height 0.15s ease,
    opacity 0.1s ease;
  max-height: 200px;
  overflow: hidden;
}
.guide-step-enter-from,
.guide-step-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
