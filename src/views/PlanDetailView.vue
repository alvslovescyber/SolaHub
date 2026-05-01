<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ArrowLeft, Users, CheckCircle } from 'lucide-vue-next'
  import { usePlansStore } from '@/stores/plans.store'
  import { useAuthStore } from '@/stores/auth.store'
  import AppPageHeader from '@/components/layout/AppPageHeader.vue'
  import AppButton from '@/components/ui/AppButton.vue'
  import AppCard from '@/components/ui/AppCard.vue'
  import AppBadge from '@/components/ui/AppBadge.vue'
  import AppAvatar from '@/components/ui/AppAvatar.vue'
  import AppSpinner from '@/components/ui/AppSpinner.vue'

  const props = defineProps<{ id: string }>()
  const plans = usePlansStore()
  const auth = useAuthStore()
  const router = useRouter()

  onMounted(() => plans.fetchPlan(props.id))

  const myParticipant = () => plans.activePlan?.participants.find((p) => p.userId === auth.user?.id)

  async function markDay(dayNumber: number) {
    await plans.recordProgress(props.id, dayNumber)
  }
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <AppPageHeader
      :title="plans.activePlan?.title ?? 'Loading...'"
      :subtitle="plans.activePlan?.description ?? undefined"
    >
      <template #actions>
        <AppButton variant="ghost" size="sm" @click="router.back()">
          <ArrowLeft class="h-4 w-4" />
          Back
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="flex-1 overflow-y-auto p-6">
      <AppSpinner v-if="plans.isLoading" />

      <div v-else-if="plans.activePlan" class="space-y-6">
        <!-- Participants -->
        <section>
          <h2
            class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"
          >
            <Users class="h-4 w-4" />
            Participants ({{ plans.activePlan.participants.length }})
          </h2>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="p in plans.activePlan.participants"
              :key="p.userId"
              class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <AppAvatar :name="p.userId" size="sm" />
              <span class="text-xs text-slate-700 dark:text-slate-300">Day {{ p.currentDay }}</span>
            </div>
          </div>
        </section>

        <!-- Days -->
        <section>
          <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Reading Schedule ({{ plans.activePlan.days.length }} days)
          </h2>
          <div class="space-y-2">
            <AppCard
              v-for="day in plans.activePlan.days"
              :key="day.dayNumber"
              :class="
                myParticipant()?.currentDay === day.dayNumber ? 'ring-2 ring-primary-500' : ''
              "
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-900 dark:text-white">
                    Day {{ day.dayNumber }}: {{ day.title }}
                  </p>
                  <p class="text-xs text-slate-500 mt-0.5">{{ day.verseRefs.join(', ') }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <AppBadge
                    v-if="(myParticipant()?.currentDay ?? 0) >= day.dayNumber"
                    variant="success"
                    size="sm"
                  >
                    <CheckCircle class="h-3 w-3 mr-1" />
                    Done
                  </AppBadge>
                  <AppButton v-else size="sm" variant="secondary" @click="markDay(day.dayNumber)">
                    Mark done
                  </AppButton>
                </div>
              </div>
            </AppCard>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
