<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { Plus, Search, Users, BookOpen, Lock } from 'lucide-vue-next'
  import { usePlansStore } from '@/stores/plans.store'
  import { useAuthStore } from '@/stores/auth.store'
  import { planStatusTone } from '@/lib/plans'
  import {
    getPlanPresentation,
    setPlanPresentation,
    getPlanAccentColor,
    PLAN_EMOJIS,
    PLAN_ACCENT_COLORS,
  } from '@/lib/planPresentation'
  import {
    SBadge,
    SButton,
    SCard,
    SCheckbox,
    SEmptyState,
    SInput,
    SLabel,
    SModal,
    SPageTabs,
    SSpinner,
    STextarea,
    STopBar,
    useSToast,
  } from '@/components/s'

  const plans = usePlansStore()
  const auth = useAuthStore()
  const router = useRouter()
  const toast = useSToast()

  const showCreate = ref(false)
  const hasFetched = ref(false)
  const title = ref('')
  const description = ref('')
  const isPublic = ref(true)
  const selectedEmoji = ref(PLAN_EMOJIS[0])
  const selectedColorId = ref(PLAN_ACCENT_COLORS[0].id)
  const search = ref('')

  const tab = ref('all')
  const tabs = computed(() => [
    { id: 'all', label: 'All', count: plans.plans.length },
    { id: 'active', label: 'Active', count: plans.activePlans.length },
    { id: 'drafts', label: 'Drafts', count: plans.draftPlans.length },
  ])

  const filtered = computed(() => {
    let list = plans.plans
    if (tab.value === 'active') list = plans.activePlans
    if (tab.value === 'drafts') list = plans.draftPlans
    const q = search.value.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
    )
  })

  onMounted(async () => {
    await plans.fetchMyPlans()
    hasFetched.value = true
  })

  function myProgress(plan: (typeof plans.plans)[number]) {
    const me = plan.participants.find((p) => p.userId === auth.user?.id)
    if (!me || plan.days.length === 0) return null
    return { current: me.currentDay, total: plan.days.length }
  }

  function resetCreateForm() {
    title.value = ''
    description.value = ''
    isPublic.value = true
    selectedEmoji.value = PLAN_EMOJIS[0]
    selectedColorId.value = PLAN_ACCENT_COLORS[0].id
  }

  function closeCreateModal() {
    showCreate.value = false
    resetCreateForm()
  }

  async function createPlan() {
    if (!title.value.trim()) return
    try {
      const plan = await plans.create({
        title: title.value.trim(),
        description: description.value.trim() || null,
        isPublic: isPublic.value,
      })
      setPlanPresentation(plan.id, { emoji: selectedEmoji.value, colorId: selectedColorId.value })
      toast.success('Reading plan created')
      showCreate.value = false
      resetCreateForm()
      await router.push({ name: 'plan-detail', params: { id: plan.id } })
    } catch {
      toast.error('Could not create plan', plans.error ?? undefined)
    }
  }

  const statusTone = planStatusTone
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0">
    <STopBar
      title="Reading plans"
      subtitle="Walk through Scripture, on your own or with your church"
    >
      <template #actions>
        <SButton size="sm" variant="primary" @click="showCreate = true">
          <template #leading>
            <Plus class="h-3.5 w-3.5" />
          </template>
          New plan
        </SButton>
      </template>
    </STopBar>

    <SPageTabs v-model="tab" :tabs="tabs" />

    <!-- Search bar -->
    <div class="px-6 pt-4 pb-2 shrink-0">
      <SInput v-model="search" size="sm" placeholder="Search plans">
        <template #leading>
          <Search class="h-3.5 w-3.5" />
        </template>
      </SInput>
    </div>

    <!-- Plan grid (scrollable) -->
    <div class="flex-1 overflow-y-auto px-6 py-4">
      <div v-if="plans.isLoading" class="flex justify-center pt-12">
        <SSpinner />
      </div>

      <SCard v-else-if="plans.error" padding="md">
        <p class="text-sm text-red-600 dark:text-red-400">
          {{ plans.error }}
        </p>
      </SCard>

      <SCard v-else-if="hasFetched && filtered.length === 0" padding="none">
        <SEmptyState
          tone="brand"
          title="No reading plans yet"
          description="Build a plan or pick a classic — like the Gospels in 30 days — to start your journey."
        >
          <template #icon>
            <BookOpen class="h-5 w-5" />
          </template>
          <template #actions>
            <SButton size="sm" @click="showCreate = true"> Create your first plan </SButton>
          </template>
        </SEmptyState>
      </SCard>

      <!-- Square card grid -->
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <button
          v-for="plan in filtered"
          :key="plan.id"
          class="group flex flex-col rounded-xl border border-line bg-surface-raised shadow-card overflow-hidden text-left transition-all hover:shadow-pop hover:-translate-y-0.5 hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          @click="router.push({ name: 'plan-detail', params: { id: plan.id } })"
        >
          <!-- Coloured header area with large emoji -->
          <div
            class="flex items-center justify-center h-[110px] w-full"
            :style="{
              backgroundColor: getPlanAccentColor(getPlanPresentation(plan.id).colorId).hex + '18',
              borderBottom: `2px solid ${getPlanAccentColor(getPlanPresentation(plan.id).colorId).hex}30`,
            }"
          >
            <span class="text-5xl leading-none select-none" role="img">{{
              getPlanPresentation(plan.id).emoji
            }}</span>
          </div>

          <!-- Content -->
          <div class="flex flex-col flex-1 p-3 gap-2 min-w-0">
            <!-- Title + status -->
            <div class="flex items-start justify-between gap-1.5">
              <p
                class="text-[13px] font-semibold font-sans text-ink-strong leading-snug line-clamp-2 flex-1"
              >
                {{ plan.title }}
              </p>
              <SBadge :tone="statusTone(plan.status)" variant="soft" dot class="shrink-0 mt-0.5">
                {{ plan.status }}
              </SBadge>
            </div>

            <!-- Description -->
            <p
              v-if="plan.description"
              class="text-[11px] text-ink-muted leading-relaxed line-clamp-2 font-sans"
            >
              {{ plan.description }}
            </p>

            <div class="flex-1" />

            <!-- Progress bar -->
            <div v-if="myProgress(plan)">
              <div
                class="flex items-center justify-between text-[10px] text-ink-muted mb-1 font-sans"
              >
                <span>Progress</span>
                <span>{{ myProgress(plan)!.current }}/{{ myProgress(plan)!.total }}d</span>
              </div>
              <div class="h-1 w-full rounded-full bg-surface-canvas overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{
                    width: `${Math.round((myProgress(plan)!.current / myProgress(plan)!.total) * 100)}%`,
                    backgroundColor: getPlanAccentColor(getPlanPresentation(plan.id).colorId).hex,
                  }"
                />
              </div>
            </div>

            <!-- Meta footer -->
            <div
              class="flex items-center gap-2.5 text-[10px] text-ink-subtle font-sans pt-1 border-t border-line-subtle"
            >
              <span class="flex items-center gap-1">
                <Users class="h-2.5 w-2.5" />
                {{ plan.participants.length }}
              </span>
              <span class="flex items-center gap-1">
                <BookOpen class="h-2.5 w-2.5" />
                {{ plan.days.length }}d
              </span>
              <span v-if="!plan.isPublic" class="flex items-center gap-1 ml-auto">
                <Lock class="h-2.5 w-2.5" />
                Private
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Create plan modal -->
    <SModal
      :open="showCreate"
      title="New reading plan"
      description="Give it a name and choose an icon to make it yours."
      size="md"
      @close="closeCreateModal"
    >
      <div class="space-y-4">
        <!-- Emoji & colour picker -->
        <div class="flex gap-4 items-start">
          <div>
            <SLabel>Icon</SLabel>
            <div class="mt-1.5 grid grid-cols-8 gap-1">
              <button
                v-for="e in PLAN_EMOJIS"
                :key="e"
                type="button"
                :class="[
                  'h-8 w-8 flex items-center justify-center rounded-md text-base transition-colors',
                  selectedEmoji === e
                    ? 'bg-brand-50 ring-2 ring-brand-500/50 dark:bg-brand-900/40'
                    : 'hover:bg-surface-canvas',
                ]"
                @click="selectedEmoji = e"
              >
                {{ e }}
              </button>
            </div>
          </div>
          <div>
            <SLabel>Colour</SLabel>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <button
                v-for="c in PLAN_ACCENT_COLORS"
                :key="c.id"
                type="button"
                :title="c.label"
                :class="[
                  'h-6 w-6 rounded-full transition-all ring-offset-2 ring-offset-surface-base',
                  selectedColorId === c.id ? 'ring-2 ring-brand-500' : 'hover:scale-110',
                ]"
                :style="{ backgroundColor: c.hex }"
                @click="selectedColorId = c.id"
              />
            </div>
          </div>
        </div>

        <SInput v-model="title" label="Title" placeholder="Gospels in 30 days" required />
        <STextarea
          v-model="description"
          label="Description"
          placeholder="A short overview to help others decide if this plan is for them."
          :rows="3"
        />
        <SCheckbox
          v-model="isPublic"
          label="Make public"
          description="Allow anyone in your church to find and join this reading plan."
        />
      </div>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="closeCreateModal"> Cancel </SButton>
        <SButton size="sm" :loading="plans.isSaving" @click="createPlan"> Create plan </SButton>
      </template>
    </SModal>
  </div>
</template>
