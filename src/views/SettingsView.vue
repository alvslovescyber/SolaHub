<script setup lang="ts">
  import { computed, ref } from 'vue'
  import {
    User as UserIcon,
    Shield,
    Bell,
    Palette,
    KeyRound,
    Languages,
    MonitorPlay,
    Music,
  } from 'lucide-vue-next'
  import { useAuth } from '@/composables/useAuth'
  import { useTheme } from '@/composables/useTheme'
  import { BIBLE_TRANSLATION_CATALOG } from '@/constants/bibleTranslations'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import type {
    PresenterBackground,
    PresenterFontScale,
    SongsIntegrationPlaceholder,
  } from '@/stores/biblePreferences.store'
  import {
    SAvatar,
    SButton,
    SCard,
    SDivider,
    SInput,
    SLabel,
    SSelect,
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
  const biblePrefs = useBiblePreferencesStore()

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
      label: 'Scripture',
      items: [
        { id: 'bible-translations', label: 'Bible & translations', icon: Languages },
        { id: 'presenter-prefs', label: 'Presenter', icon: MonitorPlay },
        { id: 'songs-media', label: 'Songs & media', icon: Music },
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
      'bible-translations': 'Bible & translations',
      'presenter-prefs': 'Presenter',
      'songs-media': 'Songs & media',
      appearance: 'Appearance',
      tokens: 'API tokens',
    }
    return map[activeId.value] ?? 'Settings'
  })

  function saveProfile() {
    toast.success('Profile saved', 'Your display name and bio were updated.')
  }

  const catalogAvailable = computed(() =>
    BIBLE_TRANSLATION_CATALOG.filter((t) => !biblePrefs.installedTranslationIds.includes(t.id))
  )

  const parallelOptions = computed(() => {
    const rows = biblePrefs.installedTranslationIds
      .filter((id) => id !== biblePrefs.defaultTranslationId)
      .map((id) => {
        const row = BIBLE_TRANSLATION_CATALOG.find((t) => t.id === id)
        return { label: row ? `${row.name} (${row.language})` : id.toUpperCase(), value: id }
      })
    return [{ label: 'None', value: '' }, ...rows]
  })

  function onParallelSelect(value: string) {
    biblePrefs.setParallelTranslation(value === '' ? null : value)
  }

  const presenterTranslationOptions = computed(() =>
    biblePrefs.installedTranslationIds.map((id) => {
      const row = BIBLE_TRANSLATION_CATALOG.find((t) => t.id === id)
      return { label: row ? `${row.name}` : id.toUpperCase(), value: id }
    })
  )

  function installTranslation(id: string) {
    biblePrefs.installTranslation(id)
    toast.success('Translation added', 'You can now choose it as your default or for presenting.')
  }

  function removeInstalled(id: string) {
    const before = biblePrefs.installedTranslationIds.length
    biblePrefs.removeTranslation(id)
    if (biblePrefs.installedTranslationIds.length === before) {
      toast.error(
        'Cannot remove',
        'Switch default translation first, or keep at least one installed.'
      )
      return
    }
    toast.success('Translation removed', 'It can be added again from the catalog below.')
  }

  const presenterFontOptions: { label: string; value: PresenterFontScale }[] = [
    { label: 'Comfortable', value: 'comfortable' },
    { label: 'Large hall', value: 'large' },
    { label: 'Auditorium', value: 'auditorium' },
  ]

  const presenterBgOptions: { label: string; value: PresenterBackground }[] = [
    { label: 'Black', value: 'black' },
    { label: 'Navy', value: 'navy' },
    { label: 'Gradient', value: 'gradient' },
  ]

  const songsIntegrationOptions = [
    { label: 'Not connected', value: 'none' },
    { label: 'Planning Center (coming soon)', value: 'planning_center', disabled: true },
    { label: 'CCLI SongSelect (coming soon)', value: 'song_select', disabled: true },
    { label: 'OpenLP bridge (coming soon)', value: 'openlp', disabled: true },
  ]

  function onSongsIntegration(value: string) {
    if (value !== 'none') {
      toast.info('Integration preview', 'OAuth and set lists will ship in a later release.')
    }
    biblePrefs.setSongsIntegration(value as SongsIntegrationPlaceholder)
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
              <template v-else-if="activeId === 'bible-translations'">
                Choose defaults, add translations to your library, and prepare parallel reading.
              </template>
              <template v-else-if="activeId === 'presenter-prefs'">
                Projection backdrop, type size, and optional translation override for Sunday
                worship.
              </template>
              <template v-else-if="activeId === 'songs-media'">
                Lyrics, copyright lines, and integrations for presenting worship alongside
                Scripture.
              </template>
              <template v-else-if="activeId === 'appearance'">
                Theme and visual preferences.
              </template>
              <template v-else-if="activeId === 'tokens'">
                Tokens for integrating with the SolaHub API.
              </template>
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

          <!-- Bible & translations -->
          <template v-else-if="activeId === 'bible-translations'">
            <SCard padding="lg" class="space-y-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SSelect
                  :model-value="biblePrefs.defaultTranslationId"
                  label="Default translation"
                  helper="Used when you read Scripture and run searches."
                  :options="biblePrefs.installedSelectOptions"
                  @update:model-value="biblePrefs.setDefaultTranslation"
                />
                <SSelect
                  :model-value="biblePrefs.parallelTranslationId ?? ''"
                  label="Parallel translation"
                  helper="Optional second text for comparison once the parallel reader ships."
                  :options="parallelOptions"
                  @update:model-value="onParallelSelect"
                />
              </div>

              <SDivider />

              <div>
                <SLabel>Installed in this app</SLabel>
                <p class="text-xs text-ink-muted mt-0.5 mb-3">
                  Remove translations you do not need — you must keep at least one, and you cannot
                  remove your current default until you choose another.
                </p>
                <ul class="space-y-2">
                  <li
                    v-for="id in biblePrefs.installedTranslationIds"
                    :key="id"
                    class="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
                  >
                    <span class="text-sm text-ink-strong">
                      {{
                        BIBLE_TRANSLATION_CATALOG.find((t) => t.id === id)?.name ?? id.toUpperCase()
                      }}
                      <span class="text-ink-muted font-normal">
                        · {{ BIBLE_TRANSLATION_CATALOG.find((t) => t.id === id)?.language ?? '' }}
                      </span>
                      <span
                        v-if="id === biblePrefs.defaultTranslationId"
                        class="ml-2 text-2xs uppercase tracking-wide text-brand-600 dark:text-brand-300"
                      >
                        Default
                      </span>
                    </span>
                    <SButton
                      v-if="biblePrefs.installedTranslationIds.length > 1"
                      size="xs"
                      variant="secondary"
                      :disabled="id === biblePrefs.defaultTranslationId"
                      @click="removeInstalled(id)"
                    >
                      Remove
                    </SButton>
                  </li>
                </ul>
              </div>

              <SDivider />

              <div>
                <SLabel>Add translation</SLabel>
                <p class="text-xs text-ink-muted mt-0.5 mb-3">
                  Desktop builds can later bundle additional offline texts; web mode streams from
                  the configured provider.
                </p>
                <div v-if="catalogAvailable.length === 0" class="text-sm text-ink-muted">
                  Every translation in our catalog is already installed.
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="row in catalogAvailable"
                    :key="row.id"
                    class="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
                  >
                    <div>
                      <p class="text-sm font-medium text-ink-strong">
                        {{ row.name }}
                      </p>
                      <p class="text-xs text-ink-muted">
                        {{ row.language }}{{ row.notes ? ` · ${row.notes}` : '' }}
                      </p>
                    </div>
                    <SButton size="xs" variant="primary" @click="installTranslation(row.id)">
                      Add
                    </SButton>
                  </div>
                </div>
              </div>
            </SCard>
          </template>

          <!-- Presenter -->
          <template v-else-if="activeId === 'presenter-prefs'">
            <SCard padding="lg" class="space-y-6">
              <SSwitch
                :model-value="biblePrefs.presenterUseSeparateTranslation"
                label="Dedicated translation for projection"
                description="Use a different translation on screen than your personal reading default — helpful when the congregation prefers formal wording."
                @update:model-value="biblePrefs.setPresenterUseSeparate"
              />

              <SSelect
                v-if="biblePrefs.presenterUseSeparateTranslation"
                :model-value="biblePrefs.presenterTranslationId ?? biblePrefs.defaultTranslationId"
                label="Presenter translation"
                :options="presenterTranslationOptions"
                @update:model-value="biblePrefs.setPresenterTranslation"
              />

              <SDivider />

              <div>
                <SLabel>Verse size</SLabel>
                <p class="text-xs text-ink-muted mt-0.5 mb-2">
                  Applies to the projector window and the preview here in Presenter.
                </p>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in presenterFontOptions"
                    :key="opt.value"
                    type="button"
                    :class="[
                      'flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors',
                      biblePrefs.presenterFontScale === opt.value
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300'
                        : 'border-line hover:bg-surface-canvas text-ink-strong',
                    ]"
                    @click="biblePrefs.setPresenterFontScale(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <div>
                <SLabel>Backdrop</SLabel>
                <div class="grid grid-cols-3 gap-2 mt-2">
                  <button
                    v-for="opt in presenterBgOptions"
                    :key="opt.value"
                    type="button"
                    :class="[
                      'flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors',
                      biblePrefs.presenterBackground === opt.value
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300'
                        : 'border-line hover:bg-surface-canvas text-ink-strong',
                    ]"
                    @click="biblePrefs.setPresenterBackground(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <SDivider />

              <SSwitch
                :model-value="biblePrefs.presenterShowVerseRef"
                label="Show verse reference on slides"
                description="Display book / chapter / verse beneath the projected text."
                @update:model-value="biblePrefs.setPresenterShowVerseRef"
              />
            </SCard>
          </template>

          <!-- Songs & media -->
          <template v-else-if="activeId === 'songs-media'">
            <SCard padding="lg" class="space-y-6">
              <SSelect
                :model-value="biblePrefs.songsIntegration"
                label="Lyrics source"
                helper="Pick where slide-ready lyrics should sync from once integrations launch."
                :options="songsIntegrationOptions"
                @update:model-value="onSongsIntegration"
              />

              <SSwitch
                :model-value="biblePrefs.songsShowCopyright"
                label="Include copyright / CCLI line on slides"
                description="Shows attribution lines when projecting lyrics — recommended for public services."
                @update:model-value="biblePrefs.setSongsShowCopyright"
              />

              <SDivider />

              <p class="text-sm text-ink-muted leading-relaxed">
                Song sequences, chord charts, and scripture-and-song layouts will plug into
                Presenter so worship leaders can run everything from one hub. Connect your
                organisation above when those OAuth flows are enabled.
              </p>
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
          <template v-else-if="activeId === 'tokens'">
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
