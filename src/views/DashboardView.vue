<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { RouterLink } from 'vue-router'
  import {
    BookOpenText,
    CalendarDays,
    StickyNote,
    Sparkles,
    ArrowUpRight,
    HelpCircle,
    PlayCircle,
    BookMarked,
    Users,
  } from 'lucide-vue-next'
  import { useAuthStore } from '@/stores/auth.store'
  import { useNotesStore } from '@/stores/notes.store'
  import { usePlansStore } from '@/stores/plans.store'
  import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
  import {
    SBadge,
    SBrandMark,
    SButton,
    SCard,
    SEmptyState,
    SPageContainer,
    SPageTabs,
    SRightRail,
    SSpinner,
    STopBar,
  } from '@/components/s'

  const auth = useAuthStore()
  const notes = useNotesStore()
  const plans = usePlansStore()
  const { isCompact } = useResponsiveLayout()

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
    {
      label: 'Notes',
      value: notes.notes.length,
      icon: StickyNote,
      iconBg: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    },
    {
      label: 'Active plans',
      value: plans.activePlans.length,
      icon: CalendarDays,
      iconBg: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    },
    {
      label: 'Drafts',
      value: plans.draftPlans.length,
      icon: Sparkles,
      iconBg: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    },
  ])

  const setupSteps = [
    {
      id: 'profile',
      title: 'Set up your profile',
      desc: 'Add a photo and let your church family know who you are.',
      route: { name: 'settings' },
    },
    {
      id: 'plan',
      title: 'Begin a reading plan',
      desc: 'Walk through Scripture day-by-day, on your own or with friends.',
      route: { name: 'plans' },
    },
    {
      id: 'invite',
      title: 'Invite your church',
      desc: 'Share notes, plans, and Sunday slides with your congregation.',
      route: { name: 'community' },
    },
  ]

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
        <!-- Setup guide -->
        <section v-if="tab === 'home'">
          <div class="flex items-end justify-between mb-3">
            <div>
              <h2 class="text-base font-semibold text-ink-strong">
                Get started
              </h2>
              <p class="text-xs text-ink-muted mt-0.5">
                A few small steps to settle into your study
              </p>
            </div>
            <SBadge
              tone="brand"
              variant="soft"
            >
              3 of 3
            </SBadge>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RouterLink
              v-for="(step, idx) in setupSteps"
              :key="step.id"
              :to="step.route"
              class="group relative overflow-hidden rounded-xl border border-line bg-surface-base hover:border-brand-200 dark:hover:border-brand-500/40 hover:shadow-card transition-all duration-150 p-4 flex flex-col no-underline hover:no-underline"
            >
              <span
                class="h-6 w-6 rounded-md inline-flex items-center justify-center text-[11px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
              >
                {{ idx + 1 }}
              </span>
              <p class="mt-3 text-[13px] font-semibold text-ink-strong">
                {{ step.title }}
              </p>
              <p class="mt-1 text-xs text-ink-muted leading-relaxed">
                {{ step.desc }}
              </p>
              <div
                class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 group-hover:text-brand-700"
              >
                Continue <ArrowUpRight class="h-3 w-3" />
              </div>
            </RouterLink>
          </div>
        </section>

        <!-- Stats -->
        <section
          v-if="tab === 'home'"
          class="mt-8"
        >
          <div class="grid grid-cols-3 gap-3">
            <article
              v-for="stat in stats"
              :key="stat.label"
              class="rounded-xl border border-line bg-surface-base p-4"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs text-ink-muted font-medium">
                    {{ stat.label }}
                  </p>
                  <p class="text-[22px] font-semibold text-ink-strong mt-1 tracking-tight">
                    {{ stat.value }}
                  </p>
                </div>
                <span
                  :class="[
                    'h-8 w-8 rounded-md inline-flex items-center justify-center',
                    stat.iconBg,
                  ]"
                >
                  <component
                    :is="stat.icon"
                    class="h-4 w-4"
                  />
                </span>
              </div>
            </article>
          </div>
        </section>

        <!-- Reading list -->
        <section
          v-if="tab === 'home' || tab === 'reading'"
          class="mt-8"
        >
          <div class="flex items-end justify-between mb-3">
            <div>
              <h2 class="text-base font-semibold text-ink-strong">
                {{ tab === 'reading' ? 'Your reading plans' : 'Today' }}
              </h2>
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
              class="flex items-center justify-between px-4 py-3 border-b border-line-subtle last:border-b-0 hover:bg-surface-canvas transition-colors no-underline hover:no-underline"
            >
              <div class="flex items-center gap-3 min-w-0">
                <span
                  class="h-8 w-8 shrink-0 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 inline-flex items-center justify-center"
                >
                  <CalendarDays class="h-4 w-4" />
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-ink-strong truncate">
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
        </section>

        <!-- Activity placeholder -->
        <section
          v-if="tab === 'activity'"
          class="mt-2"
        >
          <SCard padding="none">
            <SEmptyState
              title="No recent activity"
              description="Highlight verses, write notes, or join a plan to see updates here."
            >
              <template #icon>
                <Sparkles class="h-5 w-5" />
              </template>
            </SEmptyState>
          </SCard>
        </section>

        <!-- Quick access -->
        <section
          v-if="tab === 'home'"
          class="mt-8 mb-6"
        >
          <h2 class="text-base font-semibold text-ink-strong mb-3">
            Quick access
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RouterLink
              to="/bible"
              class="block no-underline hover:no-underline"
            >
              <SCard
                hoverable
                padding="md"
                class="h-full"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="h-8 w-8 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 inline-flex items-center justify-center"
                  >
                    <BookOpenText class="h-4 w-4" />
                  </span>
                  <div>
                    <p class="text-[13px] font-semibold text-ink-strong">
                      Open the Bible
                    </p>
                    <p class="text-xs text-ink-muted mt-0.5">
                      Read, search, and highlight Scripture
                    </p>
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
                padding="md"
                class="h-full"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="h-8 w-8 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 inline-flex items-center justify-center"
                  >
                    <StickyNote class="h-4 w-4" />
                  </span>
                  <div>
                    <p class="text-[13px] font-semibold text-ink-strong">
                      Journal a verse
                    </p>
                    <p class="text-xs text-ink-muted mt-0.5">
                      Save reflections tied to Scripture
                    </p>
                  </div>
                </div>
              </SCard>
            </RouterLink>
          </div>
        </section>
      </SPageContainer>
    </div>

    <SRightRail
      v-if="!isCompact"
      title="Help & resources"
    >
      <div class="p-4 space-y-4">
        <div class="rounded-xl border border-line bg-surface-base p-4">
          <div class="flex items-center gap-2">
            <SBrandMark :size="22" />
            <p class="text-[13px] font-semibold text-ink-strong">
              SolaHub guide
            </p>
          </div>
          <p class="mt-1.5 text-xs text-ink-muted leading-relaxed">
            A quick tour of plans, journaling, and Sunday presenter mode — set up your study in
            under five minutes.
          </p>
          <a
            href="https://solahub.app/docs/getting-started"
            target="_blank"
            rel="noopener"
            class="mt-3 inline-flex no-underline hover:no-underline"
          >
            <SButton
              size="xs"
              variant="primary"
            >
              <template #leading>
                <PlayCircle class="h-3 w-3" />
              </template>
              Watch intro
            </SButton>
          </a>
        </div>

        <div class="space-y-0.5">
          <p
            class="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-subtle px-1 py-1"
          >
            Links
          </p>
          <a
            href="https://solahub.app/docs"
            target="_blank"
            rel="noopener"
            class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[13px] text-ink hover:bg-surface-canvas transition-colors no-underline hover:no-underline"
          >
            <span class="flex items-center gap-2">
              <HelpCircle class="h-3.5 w-3.5 text-ink-muted" />
              Documentation
            </span>
            <ArrowUpRight class="h-3 w-3 text-ink-subtle" />
          </a>
          <a
            href="https://solahub.app/changelog"
            target="_blank"
            rel="noopener"
            class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[13px] text-ink hover:bg-surface-canvas transition-colors no-underline hover:no-underline"
          >
            <span class="flex items-center gap-2">
              <BookOpenText class="h-3.5 w-3.5 text-ink-muted" />
              Release notes
            </span>
            <ArrowUpRight class="h-3 w-3 text-ink-subtle" />
          </a>
          <a
            href="https://discord.gg/solahub"
            target="_blank"
            rel="noopener"
            class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[13px] text-ink hover:bg-surface-canvas transition-colors no-underline hover:no-underline"
          >
            <span class="flex items-center gap-2">
              <Users class="h-3.5 w-3.5 text-ink-muted" />
              Community Discord
            </span>
            <ArrowUpRight class="h-3 w-3 text-ink-subtle" />
          </a>
        </div>
      </div>
    </SRightRail>
  </div>
</template>
