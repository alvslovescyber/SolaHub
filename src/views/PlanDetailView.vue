<script setup lang="ts">
  import { onMounted, computed, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    ArrowLeft,
    CheckCircle2,
    Trash2,
    Users,
    Plus,
    BookOpen,
    Archive,
    Zap,
    CalendarDays,
    Link,
    Globe,
    Lock,
    Pencil,
    Copy,
    TrendingUp,
    Star,
    X,
  } from 'lucide-vue-next'
  import { usePlansStore } from '@/stores/plans.store'
  import { useAuthStore } from '@/stores/auth.store'
  import { CANONICAL_BOOKS } from '@/services/bible.service'
  import { planStatusTone } from '@/lib/plans'
  import {
    getPlanPresentation,
    setPlanPresentation,
    getPlanAccentColor,
    PLAN_EMOJIS,
    PLAN_ACCENT_COLORS,
  } from '@/lib/planPresentation'
  import {
    SAvatar,
    SBadge,
    SButton,
    SCard,
    SLabel,
    SSpinner,
    STopBar,
    SModal,
    SInput,
    useSToast,
  } from '@/components/s'

  const props = defineProps<{ id: string }>()
  const plans = usePlansStore()
  const auth = useAuthStore()
  const router = useRouter()
  const toast = useSToast()

  onMounted(() => plans.fetchPlan(props.id))

  const plan = computed(() => plans.activePlan)
  const myParticipant = computed(() => {
    const uid = auth.user?.id?.toLowerCase()
    return plan.value?.participants.find((p) => p.userId.toLowerCase() === uid)
  })
  const isOwner = computed(() => plan.value?.createdBy?.toLowerCase() === auth.user?.id?.toLowerCase())
  const isDraft = computed(() => plan.value?.status === 'Draft')
  const isActive = computed(() => plan.value?.status === 'Active')
  const isParticipant = computed(() => !!myParticipant.value)

  const progressPct = computed(() => {
    if (!plan.value || plan.value.days.length === 0 || !myParticipant.value) return 0
    return Math.round((myParticipant.value.currentDay / plan.value.days.length) * 100)
  })

  const nextDay = computed(() => {
    if (!myParticipant.value || !plan.value) return null
    const next = (myParticipant.value.currentDay ?? 0) + 1
    return plan.value.days.find((d) => d.dayNumber === next) ?? null
  })

  // ── Presentation (emoji/colour) ──────────────────────────────────
  const presentation = computed(() => (plan.value ? getPlanPresentation(plan.value.id) : { emoji: '📖', colorId: 'brand' }))
  const accentColor = computed(() => getPlanAccentColor(presentation.value.colorId))

  // ── Confirm dialog state ─────────────────────────────────────────────────
  const confirmDialog = ref<{ open: boolean; title: string; body: string; onConfirm: () => void }>({
    open: false,
    title: '',
    body: '',
    onConfirm: () => {},
  })

  function openConfirm(title: string, body: string, onConfirm: () => void) {
    confirmDialog.value = { open: true, title, body, onConfirm }
  }

  function closeConfirm() {
    confirmDialog.value.open = false
  }

  function runConfirm() {
    confirmDialog.value.onConfirm()
    closeConfirm()
  }

  const showEditIcon = ref(false)
  const editEmoji = ref('')
  const editColorId = ref('')

  function openEditIcon() {
    editEmoji.value = presentation.value.emoji
    editColorId.value = presentation.value.colorId
    showEditIcon.value = true
  }

  function saveIcon() {
    if (plan.value) {
      setPlanPresentation(plan.value.id, { emoji: editEmoji.value, colorId: editColorId.value })
    }
    showEditIcon.value = false
  }

  // ── Add day modal ────────────────────────────────────────────────
  const showAddDay = ref(false)
  const dayTitle = ref('')
  const nextDayNumber = computed(() => (plan.value?.days.length ?? 0) + 1)

  // Passage picker state
  const pickerBook = ref(CANONICAL_BOOKS[0].shortName)
  const pickerChapter = ref(1)
  const addedPassages = ref<{ key: string; display: string }[]>([])

  const pickerBookInfo = computed(
    () => CANONICAL_BOOKS.find((b) => b.shortName === pickerBook.value) ?? CANONICAL_BOOKS[0]
  )

  watch(pickerBook, () => {
    pickerChapter.value = 1
  })

  function addPassage() {
    // Use BOOK.CHAPTER.1 to satisfy the backend VerseRef (BOOK.CHAPTER.VERSE) format.
    // formatRef() strips the verse number for display, so "JHN.3.1" renders as "John 3".
    const key = `${pickerBook.value}.${pickerChapter.value}.1`
    if (addedPassages.value.some((p) => p.key === key)) return
    const display = `${pickerBookInfo.value.longName} ${pickerChapter.value}`
    addedPassages.value.push({ key, display })
  }

  function removePassage(key: string) {
    addedPassages.value = addedPassages.value.filter((p) => p.key !== key)
  }

  function openAddDay() {
    dayTitle.value = ''
    pickerBook.value = CANONICAL_BOOKS[0].shortName
    pickerChapter.value = 1
    addedPassages.value = []
    showAddDay.value = true
  }

  const canAddDay = computed(() => dayTitle.value.trim().length > 0 && addedPassages.value.length > 0)

  async function addDay() {
    if (!canAddDay.value) return
    const verseRefs = addedPassages.value.map((p) => p.key)
    try {
      await plans.addDay(props.id, {
        dayNumber: nextDayNumber.value,
        title: dayTitle.value.trim(),
        verseRefs,
      })
      toast.success(`Day ${nextDayNumber.value - 1} added`)
      showAddDay.value = false
      dayTitle.value = ''
      addedPassages.value = []
    } catch {
      toast.error('Could not add day', plans.error ?? undefined)
    }
  }

  // ── Owner actions ─────────────────────────────────────────────────
  async function publishPlan() {
    try {
      await plans.publish(props.id)
      toast.success('Plan published — members can now join')
    } catch {
      toast.error('Could not publish plan', plans.error ?? undefined)
    }
  }

  async function archivePlan() {
    openConfirm(
      'Archive plan?',
      'Participants will no longer be able to record progress.',
      async () => {
        try {
          await plans.archive(props.id)
          toast.success('Plan archived')
        } catch {
          toast.error('Could not archive plan', plans.error ?? undefined)
        }
      }
    )
  }

  async function deletePlan() {
    openConfirm(
      'Delete reading plan?',
      'This cannot be undone. All days and participant progress will be lost.',
      async () => {
        try {
          await plans.remove(props.id)
          await router.push({ name: 'plans' })
        } catch {
          toast.error('Could not delete plan', plans.error ?? undefined)
        }
      }
    )
  }

  // ── Participant actions ───────────────────────────────────────────
  async function joinPlan() {
    try {
      await plans.join(props.id)
      toast.success('You joined this reading plan')
    } catch {
      toast.error('Could not join plan')
    }
  }

  async function markDay(dayNumber: number) {
    try {
      await plans.recordProgress(props.id, dayNumber)
    } catch {
      toast.error('Could not record progress')
    }
  }

  // ── Invite ────────────────────────────────────────────────────────
  function copyInviteLink() {
    const link = `${window.location.origin}/plans/join/${props.id}`
    navigator.clipboard.writeText(link)
    toast.success('Invite link copied', 'Share it with anyone who has SolaHub installed — they can tap it to join.')
  }

  function dayState(dayNumber: number): 'done' | 'current' | 'upcoming' {
    const current = myParticipant.value?.currentDay ?? 0
    if (current >= dayNumber) return 'done'
    if (current + 1 === dayNumber) return 'current'
    return 'upcoming'
  }

  const statusTone = planStatusTone

  // ── Formatting helpers ────────────────────────────────────────────
  function formatRef(ref: string): string {
    const parts = ref.split('.')
    const book = CANONICAL_BOOKS.find((b) => b.shortName === parts[0])
    if (!book) return ref
    return parts.length >= 2 ? `${book.longName} ${parts[1]}` : book.longName
  }

  // ── Estimated completion ──────────────────────────────────────────
  const estimatedCompletion = computed(() => {
    if (!plan.value || !myParticipant.value) return null
    const remaining = plan.value.days.length - (myParticipant.value.currentDay ?? 0)
    if (remaining <= 0) return null
    const d = new Date()
    d.setDate(d.getDate() + remaining)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  })

  // ── Circular SVG progress ring ────────────────────────────────────
  const ringRadius = 36
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringDashoffset = computed(() => ringCircumference - (progressPct.value / 100) * ringCircumference)
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0 min-h-0">
    <!-- Top bar -->
    <STopBar :title="plan?.title ?? 'Loading…'">
      <template #left>
        <SButton variant="ghost" size="xs" @click="router.back()">
          <template #leading>
            <ArrowLeft class="h-3 w-3" />
          </template>
          Back
        </SButton>
      </template>
      <template #actions>
        <template v-if="plan && isOwner">
          <SButton
            v-if="isDraft && plan.days.length > 0"
            variant="primary"
            size="sm"
            :loading="plans.isSaving"
            @click="publishPlan"
          >
            <template #leading><Zap class="h-3.5 w-3.5" /></template>
            Publish plan
          </SButton>
          <SButton
            v-if="isActive"
            variant="secondary"
            size="sm"
            :loading="plans.isSaving"
            @click="archivePlan"
          >
            <template #leading><Archive class="h-3.5 w-3.5" /></template>
            Archive
          </SButton>
          <SButton variant="ghost" size="sm" @click="deletePlan">
            <template #leading><Trash2 class="h-3.5 w-3.5 text-red-500" /></template>
            Delete
          </SButton>
        </template>
        <SButton
          v-if="plan && isActive && plan.isPublic && !isParticipant"
          variant="primary"
          size="sm"
          @click="joinPlan"
        >
          Join plan
        </SButton>
      </template>
    </STopBar>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <SSpinner v-if="plans.isLoading" size="sm" class="m-6" />

      <template v-else-if="plan">
        <!-- ── HERO BANNER ─────────────────────────────────────────────── -->
        <div
          class="w-full px-6 py-7 border-b border-line-subtle"
          :style="{
            background: `linear-gradient(135deg, ${accentColor.hex}1a 0%, ${accentColor.hex}08 50%, transparent 80%), var(--s-surface-raised)`,
          }"
        >
          <div class="max-w-4xl mx-auto flex flex-col gap-4">
            <!-- Top row: icon + info + actions -->
            <div class="flex items-start gap-4">
              <!-- Emoji icon -->
              <div class="relative group shrink-0">
                <div
                  class="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl leading-none select-none ring-1 ring-line shadow-sm"
                  :style="{ backgroundColor: accentColor.hex + '22' }"
                >
                  {{ presentation.emoji }}
                </div>
                <button
                  v-if="isOwner"
                  type="button"
                  class="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-surface-base border border-line flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Change icon"
                  @click="openEditIcon"
                >
                  <Pencil class="h-3 w-3 text-ink-muted" />
                </button>
              </div>

              <!-- Plan info -->
              <div class="flex-1 min-w-0">
                <h1 class="text-xl font-bold text-ink-strong truncate">{{ plan.title }}</h1>
                <p v-if="plan.description" class="text-sm text-ink-muted mt-0.5 line-clamp-2">
                  {{ plan.description }}
                </p>
                <!-- Badges row -->
                <div class="flex items-center flex-wrap gap-1.5 mt-2">
                  <SBadge :tone="statusTone(plan.status)" variant="soft" dot>
                    {{ plan.status }}
                  </SBadge>
                  <SBadge v-if="plan.isPublic" tone="brand" variant="soft">
                    <Globe class="h-3 w-3 mr-1" />Public
                  </SBadge>
                  <SBadge v-else tone="neutral" variant="soft">
                    <Lock class="h-3 w-3 mr-1" />Private
                  </SBadge>
                </div>
                <!-- Quick stats -->
                <p class="text-xs text-ink-muted mt-2 flex items-center gap-1.5">
                  <CalendarDays class="h-3.5 w-3.5 shrink-0" />
                  <span>{{ plan.days.length }} day{{ plan.days.length !== 1 ? 's' : '' }}</span>
                  <span class="text-line">·</span>
                  <Users class="h-3.5 w-3.5 shrink-0" />
                  <span>{{ plan.participants.length }} participant{{ plan.participants.length !== 1 ? 's' : '' }}</span>
                  <template v-if="isParticipant">
                    <span class="text-line">·</span>
                    <TrendingUp class="h-3.5 w-3.5 shrink-0" />
                    <span>{{ progressPct }}% complete</span>
                  </template>
                </p>
              </div>

              <!-- Hero action buttons -->
              <div class="shrink-0 flex flex-col gap-2 items-end">
                <SButton
                  v-if="isActive && plan.isPublic && !isParticipant"
                  variant="primary"
                  size="sm"
                  @click="joinPlan"
                >
                  <template #leading><Star class="h-3.5 w-3.5" /></template>
                  Join plan
                </SButton>
                <SButton
                  v-if="isOwner && isActive && plan.isPublic"
                  variant="ghost"
                  size="sm"
                  @click="copyInviteLink"
                >
                  <template #leading><Link class="h-3.5 w-3.5" /></template>
                  Invite
                </SButton>
              </div>
            </div>
          </div>
        </div>

        <!-- ── CONTENT AREA ───────────────────────────────────────────── -->
        <div class="max-w-4xl mx-auto px-6 py-6">
          <div class="flex gap-6 items-start">

            <!-- ── LEFT COLUMN ────────────────────────────────────────── -->
            <div class="flex-1 min-w-0 flex flex-col gap-4">

              <!-- Today's reading card (active participant with a next day) -->
              <SCard
                v-if="isActive && isParticipant && nextDay"
                padding="md"
              >
                <div
                  class="absolute inset-0 rounded-xl pointer-events-none"
                  :style="{ boxShadow: `inset 0 0 0 2px ${accentColor.hex}40` }"
                />
                <div class="flex items-start gap-3">
                  <div
                    class="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
                    :style="{ backgroundColor: accentColor.hex + '22' }"
                  >
                    <BookOpen class="h-5 w-5" :style="{ color: accentColor.hex }" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      Today's reading · Day {{ nextDay.dayNumber }}
                    </p>
                    <p class="text-sm font-semibold text-ink-strong mt-0.5">{{ nextDay.title }}</p>
                    <div class="flex flex-wrap gap-1 mt-1.5">
                      <span
                        v-for="ref in nextDay.verseRefs"
                        :key="ref"
                        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-canvas border border-line-subtle text-ink-muted"
                      >
                        {{ formatRef(ref) }}
                      </span>
                    </div>
                  </div>
                  <SButton
                    variant="primary"
                    size="sm"
                    class="shrink-0"
                    :loading="plans.isSaving"
                    @click="markDay(nextDay.dayNumber)"
                  >
                    <template #leading><CheckCircle2 class="h-3.5 w-3.5" /></template>
                    Mark done
                  </SButton>
                </div>
              </SCard>

              <!-- Plan complete celebration card -->
              <SCard
                v-if="progressPct === 100 && plan.days.length > 0"
                padding="md"
              >
                <div class="flex items-center gap-3">
                  <Star class="h-5 w-5 shrink-0 text-[var(--s-success-fg)]" />
                  <div>
                    <p class="text-sm font-bold text-[var(--s-success-fg)]">Plan complete!</p>
                    <p class="text-xs text-ink-muted mt-0.5">
                      You've finished all {{ plan.days.length }} days. Well done!
                    </p>
                  </div>
                </div>
              </SCard>

              <!-- Reading schedule card -->
              <SCard padding="none">
                <header class="px-4 py-3 border-b border-line-subtle flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <CalendarDays class="h-3.5 w-3.5 text-ink-muted" />
                    <p class="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Reading schedule · {{ plan.days.length }} day{{ plan.days.length !== 1 ? 's' : '' }}
                    </p>
                  </div>
                  <SButton
                    v-if="isOwner"
                    size="xs"
                    variant="secondary"
                    @click="openAddDay"
                  >
                    <template #leading><Plus class="h-3 w-3" /></template>
                    Add day
                  </SButton>
                </header>

                <!-- Empty state -->
                <div
                  v-if="plan.days.length === 0"
                  class="py-12 flex flex-col items-center gap-3 text-center px-6"
                >
                  <div class="h-12 w-12 rounded-xl bg-surface-canvas border border-line-subtle flex items-center justify-center">
                    <BookOpen class="h-6 w-6 text-ink-subtle" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-ink-muted">No reading days yet</p>
                    <p v-if="isDraft && isOwner" class="text-xs text-ink-subtle mt-0.5">
                      Add your first day to start building the schedule.
                    </p>
                  </div>
                  <SButton
                    v-if="isDraft && isOwner"
                    size="sm"
                    variant="secondary"
                    @click="openAddDay"
                  >
                    <template #leading><Plus class="h-3.5 w-3.5" /></template>
                    Add first day
                  </SButton>
                </div>

                <!-- Day list -->
                <ul v-else>
                  <li
                    v-for="day in plan.days"
                    :key="day.dayNumber"
                    :class="[
                      'flex items-start gap-3 px-4 py-3 border-b border-line-subtle last:border-b-0',
                      dayState(day.dayNumber) === 'current' && 'bg-brand-50/50 dark:bg-brand-500/10',
                    ]"
                  >
                    <!-- State circle -->
                    <div
                      :class="[
                        'shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center',
                        dayState(day.dayNumber) === 'done'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40'
                          : dayState(day.dayNumber) === 'current'
                            ? 'bg-brand-100 dark:bg-brand-900/40 ring-2 ring-brand-400'
                            : 'bg-surface-canvas border border-line-subtle',
                      ]"
                    >
                      <CheckCircle2
                        v-if="dayState(day.dayNumber) === 'done'"
                        class="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                      />
                      <span
                        v-else
                        :class="[
                          'text-[10px] font-bold',
                          dayState(day.dayNumber) === 'current'
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-ink-muted',
                        ]"
                      >{{ day.dayNumber }}</span>
                    </div>

                    <!-- Day info -->
                    <div class="min-w-0 flex-1">
                      <p
                        :class="[
                          'text-sm font-medium',
                          dayState(day.dayNumber) === 'done'
                            ? 'text-ink-muted line-through'
                            : 'text-ink-strong',
                        ]"
                      >
                        {{ day.title }}
                      </p>
                      <div class="flex flex-wrap gap-1 mt-1">
                        <span
                          v-for="ref in day.verseRefs"
                          :key="ref"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-canvas border border-line-subtle text-ink-muted"
                        >
                          {{ formatRef(ref) }}
                        </span>
                      </div>
                    </div>

                    <!-- Action -->
                    <div class="shrink-0 mt-0.5">
                      <SButton
                        v-if="isParticipant && dayState(day.dayNumber) === 'current'"
                        size="xs"
                        variant="primary"
                        :loading="plans.isSaving"
                        @click="markDay(day.dayNumber)"
                      >
                        <template #leading><CheckCircle2 class="h-3 w-3" /></template>
                        Mark done
                      </SButton>
                      <SBadge
                        v-else-if="dayState(day.dayNumber) === 'done'"
                        tone="success"
                        variant="soft"
                      >
                        Done
                      </SBadge>
                    </div>
                  </li>
                </ul>
              </SCard>
            </div>

            <!-- ── RIGHT COLUMN ───────────────────────────────────────── -->
            <div class="w-64 shrink-0 flex flex-col gap-4">

              <!-- Progress card (active participant) -->
              <SCard
                v-if="isActive && isParticipant"
                padding="md"
              >
                <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-3">
                  Your progress
                </p>
                <!-- SVG circular ring -->
                <div class="flex items-center gap-3 mb-3">
                  <svg width="88" height="88" viewBox="0 0 88 88" class="shrink-0 -rotate-90">
                    <circle
                      cx="44" cy="44" :r="ringRadius"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="8"
                      class="text-surface-canvas"
                    />
                    <circle
                      cx="44" cy="44" :r="ringRadius"
                      fill="none"
                      :stroke="accentColor.hex"
                      stroke-width="8"
                      stroke-linecap="round"
                      :stroke-dasharray="ringCircumference"
                      :stroke-dashoffset="ringDashoffset"
                      class="transition-all duration-700"
                    />
                  </svg>
                  <div>
                    <p class="text-2xl font-bold text-ink-strong leading-none">{{ progressPct }}%</p>
                    <p class="text-xs text-ink-muted mt-0.5">
                      <template v-if="(myParticipant?.currentDay ?? 0) === 0">Not started yet</template>
                      <template v-else>{{ myParticipant?.currentDay }}/{{ plan.days.length }} days done</template>
                    </p>
                    <p v-if="estimatedCompletion" class="text-[11px] text-ink-subtle mt-1">
                      Est. {{ estimatedCompletion }}
                    </p>
                  </div>
                </div>
                <!-- Linear bar -->
                <div class="h-1.5 w-full rounded-full bg-surface-canvas overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :style="{ width: `${progressPct}%`, backgroundColor: accentColor.hex }"
                  />
                </div>
              </SCard>

              <!-- Invite card (owner + active + public) -->
              <SCard
                v-if="isOwner && isActive && plan.isPublic"
                padding="md"
              >
                <div class="flex items-center gap-2 mb-1">
                  <Link class="h-3.5 w-3.5 text-ink-muted" />
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Invite members
                  </p>
                </div>
                <p class="text-xs text-ink-muted mb-3 leading-relaxed">
                  Share a deep link so others can join this plan with one tap.
                </p>
                <SButton size="sm" variant="secondary" class="w-full" @click="copyInviteLink">
                  <template #leading><Copy class="h-3.5 w-3.5" /></template>
                  Copy invite link
                </SButton>
              </SCard>

              <!-- Participants card -->
              <SCard padding="md">
                <div class="flex items-center gap-2 mb-3">
                  <Users class="h-3.5 w-3.5 text-ink-muted" />
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Participants ({{ plan.participants.length }})
                  </p>
                </div>

                <p
                  v-if="plan.participants.length === 0"
                  class="text-xs text-ink-muted text-center py-2"
                >
                  No participants yet.
                </p>

                <div v-else class="flex flex-col gap-2">
                  <div
                    v-for="p in plan.participants"
                    :key="p.userId"
                    class="flex items-center gap-2"
                  >
                    <SAvatar :name="p.displayName || p.userId" size="sm" class="shrink-0" />
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-medium text-ink truncate">
                        {{ p.userId === auth.user?.id ? 'You' : (p.displayName || 'Unknown') }}
                      </p>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <div class="h-1 flex-1 rounded-full bg-line overflow-hidden">
                          <div
                            class="h-full rounded-full transition-all"
                            :style="{
                              width: plan.days.length > 0 ? `${Math.round((p.currentDay / plan.days.length) * 100)}%` : '0%',
                              backgroundColor: accentColor.hex,
                            }"
                          />
                        </div>
                        <span class="text-[10px] text-ink-muted shrink-0">
                          {{ p.currentDay === 0 ? 'Not started' : `${p.currentDay}/${plan.days.length}` }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </SCard>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Edit Icon Modal ──────────────────────────────────────────────── -->
    <SModal
      :open="showEditIcon"
      title="Change plan icon"
      size="sm"
      @close="showEditIcon = false"
    >
      <div class="space-y-4">
        <div>
          <SLabel>Emoji</SLabel>
          <div class="mt-1.5 grid grid-cols-8 gap-1">
            <button
              v-for="e in PLAN_EMOJIS"
              :key="e"
              type="button"
              :class="[
                'h-8 w-8 flex items-center justify-center rounded-md text-base transition-colors',
                editEmoji === e
                  ? 'bg-brand-50 ring-2 ring-brand-500/50 dark:bg-brand-900/40'
                  : 'hover:bg-surface-canvas',
              ]"
              @click="editEmoji = e"
            >
              {{ e }}
            </button>
          </div>
        </div>
        <div>
          <SLabel>Colour accent</SLabel>
          <div class="mt-1.5 flex flex-wrap gap-2">
            <button
              v-for="c in PLAN_ACCENT_COLORS"
              :key="c.id"
              type="button"
              :title="c.label"
              :class="[
                'h-6 w-6 rounded-full transition-all ring-offset-2 ring-offset-surface-base',
                editColorId === c.id ? 'ring-2 ring-brand-500' : 'hover:scale-110',
              ]"
              :style="{ backgroundColor: c.hex }"
              @click="editColorId = c.id"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="showEditIcon = false">Cancel</SButton>
        <SButton size="sm" @click="saveIcon">Save</SButton>
      </template>
    </SModal>

    <!-- ── Confirm Dialog ────────────────────────────────────────────────── -->
    <SModal
      :open="confirmDialog.open"
      :title="confirmDialog.title"
      size="sm"
      @close="closeConfirm"
    >
      <p class="text-sm text-ink-muted">{{ confirmDialog.body }}</p>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="closeConfirm">Cancel</SButton>
        <SButton variant="danger" size="sm" @click="runConfirm">Confirm</SButton>
      </template>
    </SModal>

    <!-- ── Add Day Modal ────────────────────────────────────────────────── -->
    <SModal
      :open="showAddDay"
      :title="`Add Day ${nextDayNumber}`"
      description="Give this day a title and pick the Bible passages to read."
      size="md"
      @close="showAddDay = false"
    >
      <div class="space-y-4">
        <SInput
          v-model="dayTitle"
          label="Day title"
          placeholder="The Sermon on the Mount"
          required
        />

        <!-- Visual passage picker -->
        <div>
          <SLabel>Passages</SLabel>
          <div class="mt-1.5 flex items-center gap-2">
            <!-- Book select -->
            <select
              v-model="pickerBook"
              class="flex-1 h-8 rounded-lg border border-line bg-surface-base px-2.5 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
            >
              <optgroup label="Old Testament">
                <option
                  v-for="book in CANONICAL_BOOKS.filter((b) => b.testament === 'OT')"
                  :key="book.shortName"
                  :value="book.shortName"
                >
                  {{ book.longName }}
                </option>
              </optgroup>
              <optgroup label="New Testament">
                <option
                  v-for="book in CANONICAL_BOOKS.filter((b) => b.testament === 'NT')"
                  :key="book.shortName"
                  :value="book.shortName"
                >
                  {{ book.longName }}
                </option>
              </optgroup>
            </select>

            <!-- Chapter select -->
            <select
              :value="pickerChapter"
              class="w-20 h-8 rounded-lg border border-line bg-surface-base px-2.5 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
              @change="pickerChapter = Number(($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="ch in Array.from({ length: pickerBookInfo.chapters }, (_, i) => i + 1)"
                :key="ch"
                :value="ch"
              >
                {{ ch }}
              </option>
            </select>

            <SButton size="sm" variant="secondary" @click="addPassage">
              <template #leading><Plus class="h-3.5 w-3.5" /></template>
              Add
            </SButton>
          </div>

          <!-- Added passages chips -->
          <div
            v-if="addedPassages.length > 0"
            class="mt-2.5 flex flex-wrap gap-1.5"
          >
            <span
              v-for="passage in addedPassages"
              :key="passage.key"
              class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 text-[12px] font-medium text-brand-700 dark:text-brand-300"
            >
              {{ passage.display }}
              <button
                type="button"
                class="h-4 w-4 rounded-full hover:bg-brand-200 dark:hover:bg-brand-700 flex items-center justify-center transition-colors"
                @click="removePassage(passage.key)"
              >
                <X class="h-2.5 w-2.5" />
              </button>
            </span>
          </div>
          <p v-else class="mt-1.5 text-[11px] text-ink-subtle">
            Select a book and chapter, then click Add.
          </p>
        </div>
      </div>

      <template #footer>
        <SButton variant="secondary" size="sm" @click="showAddDay = false">
          Cancel
        </SButton>
        <SButton
          size="sm"
          :loading="plans.isSaving"
          :disabled="!canAddDay"
          @click="addDay"
        >
          Add day
        </SButton>
      </template>
    </SModal>
  </div>
</template>
