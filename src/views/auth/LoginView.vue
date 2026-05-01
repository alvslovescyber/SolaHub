<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { BookOpen } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

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
  <div class="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="h-12 w-12 rounded-2xl bg-primary-600 flex items-center justify-center mb-3 shadow-lg shadow-primary-200 dark:shadow-primary-900/40">
          <BookOpen class="h-6 w-6 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">SolaHub</h1>
        <p class="text-sm text-slate-500 mt-1">Sign in to your account</p>
      </div>

      <!-- Session expired banner -->
      <div
        v-if="sessionExpired"
        class="mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm"
      >
        Your session has expired. Please sign in again.
      </div>

      <!-- Form -->
      <form class="card p-6 space-y-4" @submit.prevent="handleSubmit">
        <AppInput v-model="email" label="Email" type="email" placeholder="you@example.com" required />
        <AppInput v-model="password" label="Password" type="password" placeholder="••••••••" required />

        <div v-if="error" class="text-sm text-red-500">{{ error }}</div>

        <AppButton type="submit" class="w-full" :loading="isLoading">
          Sign in
        </AppButton>
      </form>

      <p class="text-center text-sm text-slate-500 mt-4">
        Don't have an account?
        <RouterLink to="/register" class="text-primary-600 hover:underline font-medium">
          Create one
        </RouterLink>
      </p>
    </div>
  </div>
</template>
