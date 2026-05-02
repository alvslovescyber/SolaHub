<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Inbox } from 'lucide-vue-next'
  import { SCard, SEmptyState, SPageContainer, SPageTabs, STopBar } from '@/components/s'

  const tab = ref<'all' | 'mentions' | 'shared-notes' | 'prayer'>('all')
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'mentions', label: 'Mentions' },
    { id: 'shared-notes', label: 'Shared notes' },
    { id: 'prayer', label: 'Prayer' },
  ] as const

  const tabCopy = computed(() => {
    switch (tab.value) {
      case 'mentions':
        return {
          title: 'No mentions yet',
          description: "When someone @mentions you in a note, you'll see it here.",
        }
      case 'shared-notes':
        return {
          title: 'No shared notes',
          description: 'Notes shared with you by your church family will appear here.',
        }
      case 'prayer':
        return {
          title: 'No prayer requests yet',
          description: "When your church shares a prayer request, you'll see it here.",
        }
      default:
        return {
          title: "You're all caught up",
          description:
            'Shared notes, prayer requests, and updates from your church will land here.',
        }
    }
  })
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0">
    <STopBar title="Inbox" subtitle="Shared notes, prayer requests, and church updates" />
    <SPageTabs v-model="tab" :tabs="tabs" />
    <SPageContainer max="2xl" padding="lg">
      <SCard padding="none">
        <SEmptyState tone="neutral" :title="tabCopy.title" :description="tabCopy.description">
          <template #icon>
            <Inbox class="h-5 w-5" />
          </template>
        </SEmptyState>
      </SCard>
    </SPageContainer>
  </div>
</template>
