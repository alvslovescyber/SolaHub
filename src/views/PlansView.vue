<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { Plus, CalendarDays, Search } from 'lucide-vue-next'
  import { usePlansStore } from '@/stores/plans.store'
  import { planStatusTone } from '@/lib/plans'
  import {
    SBadge,
    SButton,
    SCard,
    SCheckbox,
    SEmptyState,
    SInput,
    SModal,
    SPageContainer,
    SPageTabs,
    SSpinner,
    STextarea,
    STopBar,
  } from '@/components/s'

  const plans = usePlansStore()
  const router = useRouter()

  const showCreate = ref(false)
  const title = ref('')
  const description = ref('')
  const isPublic = ref(true)
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

  onMounted(() => plans.fetchMyPlans())

  async function createPlan() {
    if (!title.value.trim()) return
    const plan = await plans.create({
      title: title.value.trim(),
      description: description.value.trim() || null,
      isPublic: isPublic.value,
    })
    showCreate.value = false
    title.value = ''
    description.value = ''
    await router.push({ name: 'plan-detail', params: { id: plan.id } })
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

    <div class="px-6 pt-4 shrink-0">
      <SInput v-model="search" size="sm" placeholder="Search plans">
        <template #leading>
          <Search class="h-3.5 w-3.5" />
        </template>
      </SInput>
    </div>

    <SPageContainer max="2xl" padding="md">
      <SSpinner v-if="plans.isLoading" size="sm" />

      <SCard v-else-if="filtered.length === 0" padding="none">
        <SEmptyState
          tone="brand"
          title="No reading plans yet"
          description="Build a plan or pick a classic — like the Gospels in 30 days — to start your journey."
        >
          <template #icon>
            <CalendarDays class="h-5 w-5" />
          </template>
          <template #actions>
            <SButton size="sm" @click="showCreate = true"> Create your first plan </SButton>
          </template>
        </SEmptyState>
      </SCard>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SCard
          v-for="plan in filtered"
          :key="plan.id"
          hoverable
          padding="md"
          @click="router.push({ name: 'plan-detail', params: { id: plan.id } })"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink-strong truncate">
                {{ plan.title }}
              </p>
              <p v-if="plan.description" class="text-xs text-ink-muted mt-0.5 line-clamp-2">
                {{ plan.description }}
              </p>
            </div>
            <SBadge :tone="statusTone(plan.status)" variant="soft" dot>
              {{ plan.status }}
            </SBadge>
          </div>
          <div class="mt-3 flex items-center gap-3 text-2xs text-ink-muted">
            <span
              >{{ plan.participants.length }} participant{{
                plan.participants.length !== 1 ? 's' : ''
              }}</span
            >
            <span>·</span>
            <span>{{ plan.days.length }} day{{ plan.days.length !== 1 ? 's' : '' }}</span>
            <span v-if="plan.isPublic" class="ml-auto">Public</span>
          </div>
        </SCard>
      </div>
    </SPageContainer>

    <SModal :open="showCreate" title="New reading plan" size="md" @close="showCreate = false">
      <div class="space-y-3">
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
          description="Allow anyone in your church to join this reading plan."
        />
      </div>
      <template #footer>
        <SButton variant="secondary" size="sm" @click="showCreate = false"> Cancel </SButton>
        <SButton size="sm" :loading="plans.isSaving" @click="createPlan"> Create plan </SButton>
      </template>
    </SModal>
  </div>
</template>
