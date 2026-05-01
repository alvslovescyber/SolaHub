<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, CalendarDays } from 'lucide-vue-next'
import { usePlansStore } from '@/stores/plans.store'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSpinner from '@/components/ui/AppSpinner.vue'

const plans = usePlansStore()
const router = useRouter()

const showCreate = ref(false)
const title = ref('')
const description = ref('')
const isPublic = ref(true)

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

const statusVariant = (status: string) => {
  const map: Record<string, 'success' | 'warning' | 'default'> = {
    Active: 'success',
    Draft: 'default',
    Archived: 'warning',
    Completed: 'primary',
  }
  return map[status] ?? 'default'
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <AppPageHeader title="Reading Plans" subtitle="Collaborative Bible reading">
      <template #actions>
        <AppButton size="sm" @click="showCreate = !showCreate">
          <Plus class="h-4 w-4" />
          New Plan
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="flex-1 overflow-y-auto p-6 space-y-4">
      <!-- Create form -->
      <Transition name="fade">
        <AppCard v-if="showCreate" class="space-y-3">
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">New Reading Plan</p>
          <input
            v-model="title"
            placeholder="Plan title (e.g. Gospels in 30 days)"
            class="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <textarea
            v-model="description"
            rows="2"
            placeholder="Description (optional)"
            class="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            <input v-model="isPublic" type="checkbox" class="rounded accent-primary-600" />
            Make public (others can join)
          </label>
          <div class="flex gap-2 justify-end">
            <AppButton variant="secondary" size="sm" @click="showCreate = false">Cancel</AppButton>
            <AppButton size="sm" :loading="plans.isSaving" @click="createPlan">Create</AppButton>
          </div>
        </AppCard>
      </Transition>

      <AppSpinner v-if="plans.isLoading" />

      <div v-else-if="plans.plans.length === 0 && !showCreate" class="text-center text-slate-400 pt-16">
        <CalendarDays class="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p class="text-sm">No reading plans yet.</p>
      </div>

      <div v-else class="space-y-3">
        <AppCard
          v-for="plan in plans.plans"
          :key="plan.id"
          hoverable
          @click="router.push({ name: 'plan-detail', params: { id: plan.id } })"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ plan.title }}</p>
              <p v-if="plan.description" class="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {{ plan.description }}
              </p>
              <p class="text-xs text-slate-400 mt-1">
                {{ plan.participants.length }} participant{{ plan.participants.length !== 1 ? 's' : '' }}
                · {{ plan.days.length }} day{{ plan.days.length !== 1 ? 's' : '' }}
              </p>
            </div>
            <AppBadge :variant="statusVariant(plan.status)">{{ plan.status }}</AppBadge>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>
