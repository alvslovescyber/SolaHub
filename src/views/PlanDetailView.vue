<script setup lang="ts">
  import { onMounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { ArrowLeft, CheckCircle, Trash2, Users } from 'lucide-vue-next'
  import { usePlansStore } from '@/stores/plans.store'
  import { useAuthStore } from '@/stores/auth.store'
  import { planStatusTone } from '@/lib/plans'
  import {
    SAvatar,
    SBadge,
    SButton,
    SCard,
    SDivider,
    SPageContainer,
    SSpinner,
    STopBar,
  } from '@/components/s'

  const props = defineProps<{ id: string }>()
  const plans = usePlansStore()
  const auth = useAuthStore()
  const router = useRouter()

  onMounted(() => plans.fetchPlan(props.id))

  const myParticipant = computed(() =>
    plans.activePlan?.participants.find((p) => p.userId === auth.user?.id)
  )
  const isOwner = computed(() => plans.activePlan?.createdBy === auth.user?.id)

  async function markDay(dayNumber: number) {
    await plans.recordProgress(props.id, dayNumber)
  }

  async function deletePlan() {
    if (!window.confirm('Delete this reading plan? This cannot be undone.')) return
    await plans.remove(props.id)
    await router.push({ name: 'plans' })
  }

  const statusTone = planStatusTone
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0">
    <STopBar
      :title="plans.activePlan?.title ?? 'Loading…'"
      :subtitle="plans.activePlan?.description ?? undefined"
    >
      <template #left>
        <SButton variant="ghost" size="xs" @click="router.back()">
          <template #leading>
            <ArrowLeft class="h-3 w-3" />
          </template>
          Back
        </SButton>
      </template>
      <template #actions>
        <SButton v-if="isOwner" variant="secondary" size="sm" @click="deletePlan">
          <template #leading>
            <Trash2 class="h-3.5 w-3.5" />
          </template>
          Delete
        </SButton>
      </template>
    </STopBar>

    <SPageContainer max="2xl" padding="lg">
      <SSpinner v-if="plans.isLoading" size="sm" />

      <div v-else-if="plans.activePlan" class="space-y-6">
        <div class="flex items-center gap-2">
          <SBadge :tone="statusTone(plans.activePlan.status)" variant="soft" dot>
            {{ plans.activePlan.status }}
          </SBadge>
          <SBadge v-if="plans.activePlan.isPublic" tone="brand" variant="soft"> Public </SBadge>
        </div>

        <SCard padding="md">
          <div
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted"
          >
            <Users class="h-3.5 w-3.5" />
            Participants ({{ plans.activePlan.participants.length }})
          </div>
          <SDivider class="my-3" />
          <div class="flex flex-wrap gap-2">
            <div
              v-for="p in plans.activePlan.participants"
              :key="p.userId"
              class="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-surface-canvas border border-line-subtle"
            >
              <SAvatar :name="p.userId" size="xs" />
              <span class="text-xs text-ink">Day {{ p.currentDay }}</span>
            </div>
          </div>
        </SCard>

        <SCard padding="none">
          <header class="px-4 py-3 border-b border-line-subtle">
            <p class="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Reading schedule · {{ plans.activePlan.days.length }} days
            </p>
          </header>
          <ul>
            <li
              v-for="day in plans.activePlan.days"
              :key="day.dayNumber"
              :class="[
                'flex items-center justify-between gap-3 px-4 py-3 border-b border-line-subtle last:border-b-0',
                myParticipant?.currentDay === day.dayNumber &&
                  'bg-brand-50/40 dark:bg-brand-500/10',
              ]"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink-strong truncate">
                  Day {{ day.dayNumber }} · {{ day.title }}
                </p>
                <p class="text-xs text-ink-muted mt-0.5 truncate">
                  {{ day.verseRefs.join(', ') }}
                </p>
              </div>
              <div class="shrink-0">
                <SBadge
                  v-if="(myParticipant?.currentDay ?? 0) >= day.dayNumber"
                  tone="success"
                  variant="soft"
                >
                  <CheckCircle class="h-3 w-3" />
                  Done
                </SBadge>
                <SButton v-else size="xs" variant="secondary" @click="markDay(day.dayNumber)">
                  Mark done
                </SButton>
              </div>
            </li>
          </ul>
        </SCard>
      </div>
    </SPageContainer>
  </div>
</template>
