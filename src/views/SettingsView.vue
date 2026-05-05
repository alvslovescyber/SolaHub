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
    Download,
    Music2,
    Search,
    AlertCircle,
    X,
  } from 'lucide-vue-next'
  import { useAuth } from '@/composables/useAuth'
  import { useAuthStore } from '@/stores/auth.store'
  import { useTheme } from '@/composables/useTheme'
  import { BIBLE_TRANSLATION_CATALOG } from '@/constants/bibleTranslations'
  import { useBiblePreferencesStore } from '@/stores/biblePreferences.store'
  import { authService } from '@/services/auth.service'
  import type {
    PresenterBackground,
    PresenterFontScale,
    SongsIntegrationPlaceholder,
  } from '@/stores/biblePreferences.store'
  import {
    SAvatar,
    SBadge,
    SButton,
    SCard,
    SDivider,
    SInput,
    SLabel,
    SSelect,
    SSettingsList,
    SSpinner,
    SSwitch,
    STextarea,
    STopBar,
    useSToast,
  } from '@/components/s'
  import { useLanguageSongsStore } from '@/stores/languageSongs.store'
  import type { SupportedLanguage } from '@/stores/languageSongs.store'
  import type { Theme } from '@/stores/ui.store'

  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const toast = useSToast()
  const biblePrefs = useBiblePreferencesStore()
  const authStore = useAuthStore()

  const languageSongsStore = useLanguageSongsStore()
  const fileInput = ref<HTMLInputElement | null>(null)

  function pickAvatar() {
    fileInput.value?.click()
  }

  function onAvatarFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    // Avatar upload requires a media storage backend (S3/blob) which is not yet configured.
    // The file picker is kept for UX continuity; upload will be enabled in a future release.
    toast.info('Avatar upload coming soon', 'Full media storage support is on the roadmap.')
    // Reset the input so the same file can be selected again after the message
    ;(e.target as HTMLInputElement).value = ''
  }

  function resetProfile() {
    displayName.value = user.value?.displayName ?? ''
    email.value = user.value?.email ?? ''
    bio.value = ''
  }

  const profileSaving = ref(false)

  async function saveProfile() {
    if (!displayName.value.trim()) return
    profileSaving.value = true
    try {
      const { usersService } = await import('@/services/users.service')
      const updated = await usersService.updateProfile(displayName.value.trim())
      authStore.updateUser({ displayName: updated.displayName })
      toast.success('Profile saved', 'Your display name has been updated.')
    } catch {
      toast.error('Could not save profile', 'Please try again.')
    } finally {
      profileSaving.value = false
    }
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
    if (
      !/[A-Z]/.test(newPassword.value) ||
      !/[a-z]/.test(newPassword.value) ||
      !/[0-9]/.test(newPassword.value)
    ) {
      passwordError.value = 'Password must contain uppercase, lowercase, and a digit.'
      return
    }
    if (newPassword.value !== confirmPassword.value) {
      passwordError.value = 'New password and confirmation do not match.'
      return
    }
    passwordSubmitting.value = true
    try {
      await authService.changePassword(currentPassword.value, newPassword.value)
      toast.success('Password updated', 'Please sign in again with your new password.')
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      await logout()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { description?: string } } })?.response?.data
        ?.description
      passwordError.value = msg ?? 'Could not update password. Please try again.'
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
    { label: 'Aurora live', value: 'aurora' },
    { label: 'Radiance live', value: 'radiance' },
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

  interface LanguagePackConfig {
    language: SupportedLanguage
    nativeName: string
    scriptSample: string
    approxCount: number
    region: string
    accent: string
    iconBg: string
    iconText: string
    nativeTextClass: string
    headerBg: string
  }

  const mainPacks: LanguagePackConfig[] = [
    {
      language: 'Malayalam',
      nativeName: 'മലയാളം',
      scriptSample: 'മ',
      approxCount: 4472,
      region: 'Kerala · South India',
      accent: 'border-l-emerald-500',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconText: 'text-emerald-700 dark:text-emerald-300',
      nativeTextClass: 'text-emerald-700 dark:text-emerald-400',
      headerBg:
        'bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/40 dark:to-transparent',
    },
    {
      language: 'Tamil',
      nativeName: 'தமிழ்',
      scriptSample: 'த',
      approxCount: 1925,
      region: 'Tamil Nadu · Sri Lanka',
      accent: 'border-l-sky-500',
      iconBg: 'bg-sky-100 dark:bg-sky-900/40',
      iconText: 'text-sky-700 dark:text-sky-300',
      nativeTextClass: 'text-sky-700 dark:text-sky-400',
      headerBg:
        'bg-gradient-to-r from-sky-50 to-transparent dark:from-sky-950/40 dark:to-transparent',
    },
    {
      language: 'Hindi',
      nativeName: 'हिंदी',
      scriptSample: 'ह',
      approxCount: 1613,
      region: 'North India',
      accent: 'border-l-orange-500',
      iconBg: 'bg-orange-100 dark:bg-orange-900/40',
      iconText: 'text-orange-700 dark:text-orange-300',
      nativeTextClass: 'text-orange-700 dark:text-orange-400',
      headerBg:
        'bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/40 dark:to-transparent',
    },
  ]

  const comingSoonLangs = [
    { name: 'Telugu', nativeName: 'తెలుగు', source: 'VerseView', approxCount: 850 },
    { name: 'Kannada', nativeName: 'ಕನ್ನಡ', source: 'OpenSong', approxCount: 620 },
    { name: 'Marathi', nativeName: 'मराठी', source: 'OpenSong', approxCount: 540 },
    { name: 'Bengali', nativeName: 'বাংলা', source: 'OpenSong', approxCount: 480 },
    { name: 'Sinhala', nativeName: 'සිංහල', source: 'VerseView', approxCount: 390 },
    { name: 'Korean', nativeName: '한국어', source: 'SDA Hymnal', approxCount: 349 },
    { name: 'Spanish', nativeName: 'Español', source: 'Himnario Bautista', approxCount: 1200 },
    { name: 'Portuguese', nativeName: 'Português', source: 'Hinário CCB', approxCount: 1080 },
    { name: 'French', nativeName: 'Français', source: 'SDA Hymnal', approxCount: 695 },
    { name: 'Swahili', nativeName: 'Kiswahili', source: 'OpenSong', approxCount: 420 },
    { name: 'Tagalog', nativeName: 'Filipino', source: 'OpenSong', approxCount: 560 },
    { name: 'German', nativeName: 'Deutsch', source: 'Gesangbuch', approxCount: 900 },
  ]

  const songSearchQueries = ref<Record<string, string>>({})

  function getFilteredSongs(language: SupportedLanguage) {
    const pack = languageSongsStore.packs[language]
    if (!pack || pack.status !== 'ready') return []
    const q = (songSearchQueries.value[language] ?? '').toLowerCase().trim()
    if (!q) return pack.songs.slice(0, 60)
    return pack.songs
      .filter(
        (s) => s.title.toLowerCase().includes(q) || s.nativeTitle.toLowerCase().includes(q)
      )
      .slice(0, 100)
  }

  async function handleDownloadPack(language: SupportedLanguage) {
    await languageSongsStore.downloadPack(language)
    const pack = languageSongsStore.packs[language]
    if (pack.status === 'ready') {
      toast.success(
        `${language} songs added`,
        `${pack.songs.length.toLocaleString()} songs are now in your library.`
      )
    } else if (pack.status === 'error') {
      toast.error('Download failed', pack.error ?? 'Please check your connection and try again.')
    }
  }

  function handleRemovePack(language: SupportedLanguage) {
    languageSongsStore.removePack(language)
    toast.info(`${language} pack removed`, 'Songs have been cleared from your library.')
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

      <div class="flex-1 overflow-y-auto relative z-[1]">
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
                Manage worship song libraries, language packs, and projection settings for
                Sunday service.
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
                <SInput :model-value="email" label="Email" type="email" disabled />
              </div>

              <STextarea
                v-model="bio"
                label="Bio"
                placeholder="Share a bit about your faith journey or favourite passage"
                :rows="3"
              />

              <div class="flex justify-end gap-2">
                <SButton variant="secondary" size="sm" @click="resetProfile"> Cancel </SButton>
                <SButton size="sm" :loading="profileSaving" @click="saveProfile">
                  Save changes
                </SButton>
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
            <div class="space-y-5">
              <!-- Integrations & copyright -->
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
              </SCard>

              <!-- Language Song Packs -->
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-sm font-semibold text-ink-strong">Language Song Packs</h3>
                      <SBadge tone="brand" variant="soft">New</SBadge>
                    </div>
                    <p class="text-xs text-ink-muted mt-0.5 leading-relaxed">
                      Download regional worship song libraries sourced from the VerseView
                      collection. Enabled packs appear directly in your songs library and Presenter.
                    </p>
                  </div>
                </div>

                <!-- Per-language cards -->
                <div
                  v-for="pack in mainPacks"
                  :key="pack.language"
                  :class="[
                    'rounded-xl border border-line overflow-hidden bg-surface-overlay shadow-sm',
                    'border-l-4',
                    pack.accent,
                  ]"
                >
                  <!-- Card header -->
                  <div :class="['px-4 pt-4 pb-3', pack.headerBg]">
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-center gap-3">
                        <div
                          :class="[
                            'w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold select-none shrink-0',
                            pack.iconBg,
                            pack.iconText,
                          ]"
                        >
                          {{ pack.scriptSample }}
                        </div>
                        <div>
                          <p class="text-sm font-semibold text-ink-strong leading-tight">
                            {{ pack.language }}
                          </p>
                          <p :class="['text-xs font-medium leading-tight mt-0.5', pack.nativeTextClass]">
                            {{ pack.nativeName }}
                          </p>
                        </div>
                      </div>
                      <div class="shrink-0 pt-0.5">
                        <SBadge
                          v-if="languageSongsStore.packs[pack.language].status === 'ready'"
                          tone="success"
                          dot
                        >
                          Enabled
                        </SBadge>
                        <SBadge
                          v-else-if="
                            languageSongsStore.packs[pack.language].status === 'downloading'
                          "
                          tone="brand"
                          dot
                        >
                          Downloading
                        </SBadge>
                        <SBadge
                          v-else-if="languageSongsStore.packs[pack.language].status === 'error'"
                          tone="danger"
                          dot
                        >
                          Failed
                        </SBadge>
                        <SBadge v-else tone="neutral">Not installed</SBadge>
                      </div>
                    </div>

                    <!-- Meta row -->
                    <div class="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                      <span>
                        ~{{
                          languageSongsStore.packs[pack.language].status === 'ready'
                            ? languageSongsStore.packs[pack.language].songs.length.toLocaleString()
                            : pack.approxCount.toLocaleString()
                        }}
                        songs
                      </span>
                      <span class="text-ink-subtle">·</span>
                      <span>{{ pack.region }}</span>
                      <span class="text-ink-subtle">·</span>
                      <span>VerseView 2021</span>
                    </div>
                  </div>

                  <!-- Downloading state -->
                  <div
                    v-if="languageSongsStore.packs[pack.language].status === 'downloading'"
                    class="px-4 py-4 border-t border-line"
                  >
                    <div class="flex items-center gap-3">
                      <SSpinner size="sm" class="text-brand-500 shrink-0" />
                      <div class="min-w-0">
                        <p class="text-xs font-medium text-ink-strong">
                          Fetching song index from VerseView…
                        </p>
                        <p class="text-xs text-ink-muted mt-0.5">
                          This may take a few seconds. Please stay connected.
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Ready state: search + song list -->
                  <div
                    v-else-if="languageSongsStore.packs[pack.language].status === 'ready'"
                    class="border-t border-line"
                  >
                    <!-- Search bar -->
                    <div
                      class="flex items-center gap-2 px-3 py-2 border-b border-line bg-surface-canvas/50"
                    >
                      <Search class="h-3.5 w-3.5 text-ink-subtle shrink-0" />
                      <input
                        :value="songSearchQueries[pack.language]"
                        type="search"
                        :placeholder="`Search ${pack.language} songs…`"
                        class="flex-1 text-xs bg-transparent text-ink-strong placeholder:text-ink-subtle outline-none min-w-0"
                        @input="
                          songSearchQueries[pack.language] = (
                            $event.target as HTMLInputElement
                          ).value
                        "
                      />
                      <button
                        v-if="songSearchQueries[pack.language]"
                        type="button"
                        class="text-ink-subtle hover:text-ink transition-colors"
                        @click="songSearchQueries[pack.language] = ''"
                      >
                        <X class="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <!-- Song list -->
                    <div class="max-h-52 overflow-y-auto divide-y divide-line">
                      <div
                        v-for="song in getFilteredSongs(pack.language)"
                        :key="song.id"
                        class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-canvas transition-colors"
                      >
                        <Music2 class="h-3.5 w-3.5 text-ink-subtle shrink-0" />
                        <div class="min-w-0 flex-1">
                          <p class="text-xs font-medium text-ink-strong truncate">
                            {{ song.title }}
                          </p>
                          <p
                            v-if="song.nativeTitle"
                            class="text-xs text-ink-muted truncate mt-0.5"
                          >
                            {{ song.nativeTitle }}
                          </p>
                        </div>
                      </div>
                      <div
                        v-if="getFilteredSongs(pack.language).length === 0"
                        class="flex flex-col items-center justify-center py-6 text-center"
                      >
                        <Music2 class="h-5 w-5 text-ink-subtle mb-1.5" />
                        <p class="text-xs text-ink-muted">No songs match your search.</p>
                      </div>
                    </div>

                    <!-- Footer -->
                    <div
                      class="px-4 py-2.5 border-t border-line flex items-center justify-between bg-surface-canvas/30"
                    >
                      <p class="text-xs text-ink-muted">
                        {{
                          languageSongsStore.packs[pack.language].songs.length.toLocaleString()
                        }}
                        songs in library
                        <span
                          v-if="songSearchQueries[pack.language]"
                          class="text-ink-subtle ml-1"
                        >
                          · showing {{ getFilteredSongs(pack.language).length }} results
                        </span>
                      </p>
                      <SButton
                        size="xs"
                        variant="danger"
                        @click="handleRemovePack(pack.language)"
                      >
                        Remove pack
                      </SButton>
                    </div>
                  </div>

                  <!-- Error state -->
                  <div
                    v-else-if="languageSongsStore.packs[pack.language].status === 'error'"
                    class="px-4 py-3 border-t border-line"
                  >
                    <div class="flex items-start gap-2.5 mb-3">
                      <AlertCircle class="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <div class="min-w-0">
                        <p class="text-xs font-medium text-red-700 dark:text-red-400">
                          Download failed
                        </p>
                        <p class="text-xs text-ink-muted mt-0.5">
                          {{ languageSongsStore.packs[pack.language].error }}
                        </p>
                      </div>
                    </div>
                    <SButton size="sm" @click="handleDownloadPack(pack.language)">
                      <Download class="h-3.5 w-3.5 mr-1.5" />
                      Try again
                    </SButton>
                  </div>

                  <!-- Idle state: not downloaded -->
                  <div v-else class="px-4 py-3.5 border-t border-line flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs font-medium text-ink-strong">Not installed</p>
                      <p class="text-xs text-ink-muted mt-0.5">
                        Adds ~{{ pack.approxCount.toLocaleString() }} songs to your library
                      </p>
                    </div>
                    <SButton size="sm" @click="handleDownloadPack(pack.language)">
                      <Download class="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </SButton>
                  </div>
                </div>

                <!-- Coming soon catalog -->
                <div class="pt-1">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-2xs font-semibold uppercase tracking-wider text-ink-subtle">
                      In catalog · coming soon
                    </p>
                    <SBadge tone="neutral" variant="outline">
                      {{ comingSoonLangs.length }} languages
                    </SBadge>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div
                      v-for="lang in comingSoonLangs"
                      :key="lang.name"
                      class="rounded-lg border border-line bg-surface-overlay px-3 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                          <p class="text-xs font-medium text-ink-strong leading-tight truncate">
                            {{ lang.name }}
                          </p>
                          <span class="text-ink-subtle text-xs leading-tight">·</span>
                          <p class="text-xs text-ink-muted leading-tight truncate">
                            {{ lang.nativeName }}
                          </p>
                        </div>
                        <p class="text-2xs text-ink-subtle mt-0.5 truncate">
                          {{ lang.source }} · ~{{ lang.approxCount.toLocaleString() }} songs
                        </p>
                      </div>
                      <SBadge tone="neutral" variant="soft" class="shrink-0 text-2xs">
                        Soon
                      </SBadge>
                    </div>
                  </div>
                  <p class="text-xs text-ink-muted mt-2 text-center">
                    More languages are added regularly. Sources include VerseView, OpenSong, SDA
                    Hymnal, and regional collections.
                  </p>
                </div>
              </div>
            </div>
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
