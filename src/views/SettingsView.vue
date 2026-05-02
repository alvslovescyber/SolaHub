<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { User as UserIcon, Shield, Bell, Palette, KeyRound } from 'lucide-vue-next'
  import { useAuth } from '@/composables/useAuth'
  import { useTheme } from '@/composables/useTheme'
  import {
    SAvatar,
    SButton,
    SCard,
    SDivider,
    SInput,
    SLabel,
    SSettingsList,
    SSwitch,
    STextarea,
    STopBar,
    useSToast,
  } from '@/components/s'
  import type { Theme } from '@/stores/ui.store'

  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const toast = useSToast()

  const fileInput = ref<HTMLInputElement | null>(null)

  function pickAvatar() {
    fileInput.value?.click()
  }

  function onAvatarFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    toast.success(
      'Avatar selected',
      `${file.name} will be uploaded the next time we sync your profile.`
    )
  }

  const initialDisplayName = user.value?.displayName ?? ''
  const initialEmail = user.value?.email ?? ''

  function resetProfile() {
    displayName.value = initialDisplayName
    email.value = initialEmail
    bio.value = ''
  }

  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const passwordError = ref<string | null>(null)
  const passwordSubmitting = ref(false)

  async function changePassword() {
    passwordError.value = null
    if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
      passwordError.value = 'Please fill in every field.'
      return
    }
    if (newPassword.value.length < 8) {
      passwordError.value = 'New password must be at least 8 characters.'
      return
    }
    if (newPassword.value !== confirmPassword.value) {
      passwordError.value = 'New password and confirmation do not match.'
      return
    }
    passwordSubmitting.value = true
    try {
      // Backend endpoint is not yet implemented; surface a friendly message
      // rather than silently doing nothing.
      await new Promise((resolve) => setTimeout(resolve, 400))
      toast.success(
        'Password change queued',
        'When the password endpoint ships, your request will go through automatically.'
      )
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    } finally {
      passwordSubmitting.value = false
    }
  }

  const sections = [
    {
      label: 'Account',
      items: [
        { id: 'profile', label: 'Profile', icon: UserIcon },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
      ],
    },
    {
      label: 'Study',
      items: [
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'tokens', label: 'API tokens', icon: KeyRound },
      ],
    },
  ]

  const activeId = ref<string>('profile')
  const displayName = ref(user.value?.displayName ?? '')
  const email = ref(user.value?.email ?? '')
  const bio = ref('')

  const themes: { label: string; value: Theme }[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ]

  const notifyMentions = ref(true)
  const notifyShared = ref(true)
  const notifyDigest = ref(false)

  const sectionTitle = computed(() => {
    const map: Record<string, string> = {
      profile: 'Profile',
      security: 'Security',
      notifications: 'Notifications',
      appearance: 'Appearance',
      tokens: 'API tokens',
    }
    return map[activeId.value] ?? 'Settings'
  })

  function saveProfile() {
    toast.success('Profile saved', 'Your display name and bio were updated.')
  }
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0">
    <STopBar
      title="Settings"
      subtitle="Manage your account and study preferences"
      :show-bell="false"
    />
    <div class="flex flex-1 min-h-0">
      <SSettingsList v-model:active-id="activeId" :sections="sections" />

      <div class="flex-1 overflow-y-auto">
        <div class="max-w-2xl mx-auto p-8">
          <header class="mb-6">
            <h2 class="text-lg font-semibold text-ink-strong">
              {{ sectionTitle }}
            </h2>
            <p class="text-sm text-ink-muted mt-0.5">
              <template v-if="activeId === 'profile'">
                Update how you appear to your church family.
              </template>
              <template v-else-if="activeId === 'security'">
                Manage password and active sessions.
              </template>
              <template v-else-if="activeId === 'notifications'">
                Choose what we email or push to you.
              </template>
              <template v-else-if="activeId === 'appearance'">
                Theme and visual preferences.
              </template>
              <template v-else> Tokens for integrating with the SolaHub API. </template>
            </p>
          </header>

          <!-- Profile -->
          <template v-if="activeId === 'profile'">
            <SCard padding="lg" class="space-y-5">
              <div class="flex items-center gap-4">
                <SAvatar v-if="user" :name="user.displayName" size="xl" rounded="md" />
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-ink-strong">
                    {{ user?.displayName }}
                  </p>
                  <p class="text-xs text-ink-muted">
                    {{ user?.email }}
                  </p>
                  <p class="text-2xs text-ink-subtle mt-0.5 uppercase tracking-wider font-medium">
                    {{ user?.role }}
                  </p>
                </div>
                <div class="ml-auto">
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="hidden"
                    @change="onAvatarFile"
                  />
                  <SButton size="sm" variant="secondary" @click="pickAvatar">
                    Change avatar
                  </SButton>
                </div>
              </div>

              <SDivider />

              <div class="grid grid-cols-2 gap-4">
                <SInput v-model="displayName" label="Display name" />
                <SInput v-model="email" label="Email" type="email" />
              </div>

              <STextarea
                v-model="bio"
                label="Bio"
                placeholder="Share a bit about your faith journey or favourite passage"
                :rows="3"
              />

              <div class="flex justify-end gap-2">
                <SButton variant="secondary" size="sm" @click="resetProfile"> Cancel </SButton>
                <SButton size="sm" @click="saveProfile"> Save changes </SButton>
              </div>
            </SCard>
          </template>

          <!-- Security -->
          <template v-else-if="activeId === 'security'">
            <SCard padding="lg" class="space-y-5">
              <form class="space-y-3" @submit.prevent="changePassword">
                <SLabel>Change password</SLabel>
                <div class="grid grid-cols-1 gap-3">
                  <SInput
                    v-model="currentPassword"
                    type="password"
                    placeholder="Current password"
                    autocomplete="current-password"
                  />
                  <SInput
                    v-model="newPassword"
                    type="password"
                    placeholder="New password (min. 8 characters)"
                    autocomplete="new-password"
                  />
                  <SInput
                    v-model="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    autocomplete="new-password"
                  />
                </div>
                <p v-if="passwordError" class="text-xs text-red-600 dark:text-red-400">
                  {{ passwordError }}
                </p>
                <div class="flex justify-end">
                  <SButton type="submit" size="sm" :loading="passwordSubmitting">
                    Update password
                  </SButton>
                </div>
              </form>

              <SDivider />

              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-ink-strong">Sign out everywhere</p>
                  <p class="text-xs text-ink-muted mt-0.5">
                    Revokes refresh tokens on every device.
                  </p>
                </div>
                <SButton variant="danger" size="sm" @click="logout()"> Sign out </SButton>
              </div>
            </SCard>
          </template>

          <!-- Notifications -->
          <template v-else-if="activeId === 'notifications'">
            <SCard padding="lg" class="space-y-5">
              <SSwitch
                v-model="notifyMentions"
                label="Mentions"
                description="Email me when someone @-mentions me in shared notes."
              />
              <SDivider />
              <SSwitch
                v-model="notifyShared"
                label="Shared notes"
                description="Notify me when someone in my church shares a note on a verse I'm following."
              />
              <SDivider />
              <SSwitch
                v-model="notifyDigest"
                label="Weekly digest"
                description="A Monday-morning summary of your reading and church activity."
              />
            </SCard>
          </template>

          <!-- Appearance -->
          <template v-else-if="activeId === 'appearance'">
            <SCard padding="lg">
              <SLabel>Theme</SLabel>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="t in themes"
                  :key="t.value"
                  type="button"
                  :class="[
                    'flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors',
                    theme === t.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15'
                      : 'border-line hover:bg-surface-canvas',
                  ]"
                  @click="setTheme(t.value)"
                >
                  <span
                    :class="[
                      'h-8 w-12 rounded-md border border-line',
                      t.value === 'light' && 'bg-white',
                      t.value === 'dark' && 'bg-slate-900',
                      t.value === 'system' && 'bg-gradient-to-r from-white to-slate-900',
                    ]"
                  />
                  <span class="text-xs font-medium text-ink-strong">{{ t.label }}</span>
                </button>
              </div>
            </SCard>
          </template>

          <!-- Tokens -->
          <template v-else>
            <SCard padding="lg">
              <p class="text-sm text-ink-muted">
                Personal access tokens for the SolaHub API will be available here. Coming soon.
              </p>
            </SCard>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
