<script setup lang="ts">
  import { ref } from 'vue'
  import { RouterLink, useRoute } from 'vue-router'
  import { useAuth } from '@/composables/useAuth'
  import { SBrandMark, SButton, SInput } from '@/components/s'

  const route = useRoute()
  const { login, isLoading, error } = useAuth()

  const email = ref('')
  const password = ref('')

  const sessionExpired = route.query.reason === 'session-expired'

  async function handleSubmit() {
    await login(
      email.value,
      password.value,
      typeof route.query.redirect === 'string' ? route.query.redirect : undefined
    )
  }
</script>

<template>
  <div class="s-auth-gradient h-screen w-screen flex items-center justify-center p-6">
    <div class="w-full max-w-[380px]">
      <div class="flex flex-col items-center mb-7">
        <SBrandMark :size="44" />
        <h1 class="mt-3 text-xl font-semibold text-ink-strong tracking-tight">
          Welcome back to SolaHub
        </h1>
        <p class="text-sm text-ink-muted mt-1">Sign in to continue your Bible study</p>
      </div>

      <div class="s-auth-card">
        <div
          v-if="sessionExpired"
          class="mb-4 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-200"
        >
          Your session has expired. Please sign in again.
        </div>

        <form class="s-auth-card-fields space-y-3.5" @submit.prevent="handleSubmit">
          <SInput
            v-model="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
            autofocus
          />
          <SInput
            v-model="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            autocomplete="current-password"
            required
          />

          <p v-if="error" class="text-xs text-red-600 dark:text-red-400">
            {{ error }}
          </p>

          <SButton type="submit" full-width :loading="isLoading" size="md">
            Sign in with email
          </SButton>
        </form>
      </div>

      <p class="text-center text-xs text-ink-muted mt-5">
        Don't have an account?
        <RouterLink to="/register" class="text-brand-600 font-medium hover:underline">
          Create one
        </RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
  /* Recessed fields on the auth panel so inputs stay legible on frosted light / raised dark. */
  .s-auth-card-fields :deep(input) {
    background-color: var(--s-surface-base);
  }

  .s-auth-card-fields :deep(input::placeholder) {
    color: var(--s-text-subtle);
  }
</style>
