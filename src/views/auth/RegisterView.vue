<script setup lang="ts">
  import { ref } from 'vue'
  import { RouterLink } from 'vue-router'
  import { useAuth } from '@/composables/useAuth'
  import { SBrandMark, SButton, SInput } from '@/components/s'

  const { register, isLoading, error } = useAuth()

  const displayName = ref('')
  const email = ref('')
  const password = ref('')

  async function handleSubmit() {
    await register(email.value, password.value, displayName.value)
  }
</script>

<template>
  <div class="s-auth-gradient h-screen w-screen flex items-center justify-center p-6">
    <div class="w-full max-w-[380px]">
      <div class="flex flex-col items-center mb-7">
        <SBrandMark :size="44" />
        <h1 class="mt-3 text-xl font-semibold text-ink-strong tracking-tight">
          Create your account
        </h1>
        <p class="text-sm text-ink-muted mt-1">
          Begin reading, journaling, and worshiping together
        </p>
      </div>

      <div class="s-auth-card">
        <form class="s-auth-card-fields space-y-3.5" @submit.prevent="handleSubmit">
          <SInput
            v-model="displayName"
            label="Display name"
            placeholder="Jane Doe"
            autocomplete="name"
            required
            autofocus
          />
          <SInput
            v-model="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
          />
          <SInput
            v-model="password"
            label="Password"
            type="password"
            placeholder="Min 8 chars, upper, lower, digit"
            autocomplete="new-password"
            required
          />

          <p v-if="error" class="text-xs text-red-600 dark:text-red-400">
            {{ error }}
          </p>

          <SButton type="submit" full-width :loading="isLoading" size="md">
            Create account
          </SButton>
        </form>
      </div>

      <p class="text-center text-xs text-ink-muted mt-5">
        Already have an account?
        <RouterLink to="/login" class="text-brand-600 font-medium hover:underline">
          Sign in
        </RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
  .s-auth-card-fields :deep(input) {
    background-color: var(--s-surface-base);
  }

  .s-auth-card-fields :deep(input::placeholder) {
    color: var(--s-text-subtle);
  }
</style>
