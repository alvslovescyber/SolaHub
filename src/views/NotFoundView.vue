<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
</script>

<template>
  <div class="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
    <p class="text-6xl font-bold text-slate-200 dark:text-slate-800">404</p>
    <p class="text-lg font-medium text-slate-900 dark:text-white">Page not found</p>
    <p class="text-sm text-slate-500">The page you're looking for doesn't exist.</p>
    <AppButton variant="secondary" @click="router.push({ name: 'dashboard' })">
      Go to Dashboard
    </AppButton>
  </div>
</template>
