<script setup lang="ts">
import { ref } from 'vue'
import { BookOpen } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const { register, isLoading, error } = useAuth()

const displayName = ref('')
const email = ref('')
const password = ref('')

async function handleSubmit() {
  await register(email.value, password.value, displayName.value)
}
</script>

<template>
  <div class="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
    <div class="w-full max-w-sm">
      <div class="flex flex-col items-center mb-8">
        <div class="h-12 w-12 rounded-2xl bg-primary-600 flex items-center justify-center mb-3 shadow-lg shadow-primary-200 dark:shadow-primary-900/40">
          <BookOpen class="h-6 w-6 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Create account</h1>
        <p class="text-sm text-slate-500 mt-1">Start your SolaHub journey</p>
      </div>

      <form class="card p-6 space-y-4" @submit.prevent="handleSubmit">
        <AppInput v-model="displayName" label="Display name" placeholder="John Smith" required />
        <AppInput v-model="email" label="Email" type="email" placeholder="you@example.com" required />
        <AppInput v-model="password" label="Password" type="password" placeholder="Min 8 chars, upper, lower, digit" required />

        <div v-if="error" class="text-sm text-red-500">{{ error }}</div>

        <AppButton type="submit" class="w-full" :loading="isLoading">
          Create account
        </AppButton>
      </form>

      <p class="text-center text-sm text-slate-500 mt-4">
        Already have an account?
        <RouterLink to="/login" class="text-primary-600 hover:underline font-medium">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>
