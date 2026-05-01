<script setup lang="ts">
import { Users } from 'lucide-vue-next'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <AppPageHeader title="Community" subtitle="Connect with your church" />
    <div class="flex-1 flex items-center justify-center text-slate-400">
      <div class="text-center">
        <Users class="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p class="text-sm font-medium">Community features coming soon</p>
        <p class="text-xs mt-1">Church directory, groups, and announcements</p>
      </div>
    </div>
  </div>
</template>
