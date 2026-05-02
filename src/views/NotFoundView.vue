<script setup lang="ts">
  import { RouterLink } from 'vue-router'
  import { SBrandMark, SButton } from '@/components/s'
</script>

<template>
  <div
    class="s-auth-gradient h-screen w-screen flex flex-col items-center justify-center gap-4 p-6"
  >
    <SBrandMark :size="40" />
    <p class="text-6xl font-semibold text-ink-strong/20 tracking-tight">404</p>
    <p class="text-base font-semibold text-ink-strong">Page not found</p>
    <p class="text-sm text-ink-muted">The page you're looking for doesn't exist.</p>
    <RouterLink :to="{ name: 'dashboard' }" class="no-underline hover:no-underline">
      <SButton variant="primary" size="sm"> Back to dashboard </SButton>
    </RouterLink>
  </div>
</template>
