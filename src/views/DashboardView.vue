<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { BookOpen, StickyNote, CalendarDays, TrendingUp } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useNotesStore } from '@/stores/notes.store'
import { usePlansStore } from '@/stores/plans.store'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSpinner from '@/components/ui/AppSpinner.vue'

const auth = useAuthStore()
const notes = useNotesStore()
const plans = usePlansStore()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const stats = computed(() => [
  { label: 'Notes', value: notes.notes.length, icon: StickyNote, color: 'text-blue-500' },
  { label: 'Active Plans', value: plans.activePlans.length, icon: CalendarDays, color: 'text-emerald-500' },
  { label: 'Draft Plans', value: plans.draftPlans.length, icon: TrendingUp, color: 'text-amber-500' },
])

onMounted(async () => {
  await Promise.all([notes.fetchMyNotes(), plans.fetchMyPlans()])
})
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <AppPageHeader
      :title="`${greeting}, ${auth.user?.displayName ?? 'friend'}`"
      subtitle="Here's an overview of your activity."
    />

    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- Stats row -->
      <div class="grid grid-cols-3 gap-4">
        <AppCard v-for="stat in stats" :key="stat.label">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <component :is="stat.icon" :class="['h-5 w-5', stat.color]" />
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ stat.value }}</p>
              <p class="text-xs text-slate-500">{{ stat.label }}</p>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Recent plans -->
      <section>
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <CalendarDays class="h-4 w-4" />
          Recent Plans
        </h2>

        <AppSpinner v-if="plans.isLoading" />

        <div v-else-if="plans.plans.length === 0" class="text-sm text-slate-500">
          No reading plans yet. <RouterLink to="/plans" class="text-primary-600 hover:underline">Create one →</RouterLink>
        </div>

        <div v-else class="space-y-2">
          <RouterLink
            v-for="plan in plans.plans.slice(0, 5)"
            :key="plan.id"
            :to="{ name: 'plan-detail', params: { id: plan.id } }"
            class="flex items-center justify-between p-3 rounded-lg card hover:shadow-md transition-shadow"
          >
            <div>
              <p class="text-sm font-medium text-slate-900 dark:text-white">{{ plan.title }}</p>
              <p class="text-xs text-slate-500">{{ plan.participants.length }} participant{{ plan.participants.length !== 1 ? 's' : '' }}</p>
            </div>
            <span
              :class="[
                'text-xs font-medium px-2 py-1 rounded-full',
                plan.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                plan.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                'bg-amber-100 text-amber-700',
              ]"
            >{{ plan.status }}</span>
          </RouterLink>
        </div>
      </section>

      <!-- Quick access Bible -->
      <section>
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <BookOpen class="h-4 w-4" />
          Quick Access
        </h2>
        <RouterLink
          to="/bible"
          class="block card p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
              <BookOpen class="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-slate-900 dark:text-white">Open Bible</p>
              <p class="text-xs text-slate-500">Read, search, and annotate Scripture</p>
            </div>
          </div>
        </RouterLink>
      </section>
    </div>
  </div>
</template>
