<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Users, Plus } from 'lucide-vue-next'
  import {
    SButton,
    SCard,
    SEmptyState,
    SPageContainer,
    SPageTabs,
    STopBar,
    useSToast,
  } from '@/components/s'

  const tab = ref<'feed' | 'people' | 'groups' | 'announcements'>('feed')
  const tabs = [
    { id: 'feed', label: 'Feed' },
    { id: 'people', label: 'People' },
    { id: 'groups', label: 'Groups' },
    { id: 'announcements', label: 'Announcements' },
  ] as const
  const toast = useSToast()

  const tabCopy = computed(() => {
    switch (tab.value) {
      case 'people':
        return {
          title: 'Your church directory will live here',
          description:
            'Soon you will be able to find brothers and sisters in your church, see their notes, and pray for them.',
        }
      case 'groups':
        return {
          title: 'Small groups are on the way',
          description:
            'Create a Bible study group, share a plan, and journal together — coming soon.',
        }
      case 'announcements':
        return {
          title: 'No announcements yet',
          description: 'Pastors and church admins can post Sunday updates here once invited.',
        }
      default:
        return {
          title: 'Community is rolling out soon',
          description:
            "Directories, small groups, and prayer chains are on the way. We'll let you know the moment they're live.",
        }
    }
  })

  function startPost() {
    toast.info(
      'Posts coming soon',
      'We are still building the community feed. Stay tuned for the next release.'
    )
  }
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0">
    <STopBar
      title="Community"
      subtitle="Your church family, in one place"
    >
      <template #actions>
        <SButton
          size="sm"
          variant="primary"
          @click="startPost"
        >
          <template #leading>
            <Plus class="h-3.5 w-3.5" />
          </template>
          New post
        </SButton>
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
      <SCard padding="none">
        <SEmptyState
          tone="neutral"
          :title="tabCopy.title"
          :description="tabCopy.description"
        >
          <template #icon>
            <Users class="h-5 w-5" />
          </template>
        </SEmptyState>
      </SCard>
    </SPageContainer>
  </div>
</template>
