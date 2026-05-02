<script setup lang="ts">
  import { ref } from 'vue'
  import { RouterLink, useRoute } from 'vue-router'
  import { useAuth } from '@/composables/useAuth'
  import { SBrandMark, SButton, SDivider, SInput } from '@/components/s'

  const route = useRoute()
  const { login, isLoading, error } = useAuth()

  const email = ref('')
  const password = ref('')

  const sessionExpired = route.query.reason === 'session-expired'

  async function handleSubmit() {
    await login(email.value, password.value)
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

      <div
        class="rounded-xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-modal p-6 dark:bg-surface-raised/70 dark:border-line"
      >
        <div
          v-if="sessionExpired"
          class="mb-4 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-200"
        >
          Your session has expired. Please sign in again.
        </div>

        <form class="space-y-3.5" @submit.prevent="handleSubmit">
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

        <div class="my-4">
          <SDivider label="or sign in with" />
        </div>

        <SButton variant="secondary" full-width disabled>
          <template #leading>
            <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
              <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
              <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
              <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
              <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
            </svg>
          </template>
          Microsoft
        </SButton>
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
