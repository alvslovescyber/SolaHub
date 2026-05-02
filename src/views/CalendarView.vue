<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { CalendarDays, Plus } from 'lucide-vue-next'
  import {
    SButton,
    SCard,
    SEmptyState,
    SPageContainer,
    SPageTabs,
    STopBar,
    useSToast,
  } from '@/components/s'

  const router = useRouter()
  const toast = useSToast()

  const tab = ref<'upcoming' | 'plan-days' | 'services'>('upcoming')
  const tabs = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'plan-days', label: 'Plan days' },
    { id: 'services', label: 'Services' },
  ] as const

  function newEvent() {
    toast.info('Calendar coming soon', 'We are still wiring this up to your reading plans.')
  }

  function backToDashboard() {
    void router.push({ name: 'dashboard' })
  }
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0">
    <STopBar title="Calendar" subtitle="Reading plan days, services, and church events">
      <template #actions>
        <SButton size="sm" variant="primary" @click="newEvent">
          <template #leading>
            <Plus class="h-3.5 w-3.5" />
          </template>
          New event
        </SButton>
      </template>
    </STopBar>
    <SPageTabs v-model="tab" :tabs="tabs" />
    <SPageContainer max="2xl" padding="lg">
      <SCard padding="none">
        <SEmptyState
          tone="neutral"
          title="Calendar coming soon"
          description="Your reading days and Sunday services will appear here once we wire it up to your plans."
        >
          <template #icon>
            <CalendarDays class="h-5 w-5" />
          </template>
          <template #actions>
            <SButton variant="secondary" size="sm" @click="backToDashboard">
              Back to Dashboard
            </SButton>
          </template>
        </SEmptyState>
      </SCard>
    </SPageContainer>
  </div>
</template>
