<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { Channel, invoke } from '@tauri-apps/api/core'
  import { DownloadCloud, RefreshCw } from 'lucide-vue-next'
  import { clearUpdateReturnRoute, rememberUpdateReturnRoute } from '@/lib/appUpdate'
  import { isTauri } from '@/lib/platform'
  import STooltip from './STooltip.vue'
  import { useSToast } from './useSToast'

  interface Props {
    collapsed?: boolean
    fullWidth?: boolean
  }

  type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'installing'
  type UpdateResultStatus = 'notConfigured' | 'upToDate'

  interface AppUpdateResult {
    status: UpdateResultStatus
    currentVersion: string
    version: string | null
  }

  type UpdateDownloadEvent =
    | { event: 'Started'; data: { contentLength?: number | null } }
    | { event: 'Progress'; data: { chunkLength: number } }
    | { event: 'Finished' }

  const props = defineProps<Props>()
  const toast = useSToast()
  const route = useRoute()

  const busy = ref(false)
  const status = ref<UpdateStatus>('idle')
  const downloadedBytes = ref(0)
  const contentLength = ref<number | null>(null)

  const progressPercent = computed(() => {
    if (!contentLength.value || contentLength.value <= 0) return null
    return Math.min(99, Math.round((downloadedBytes.value / contentLength.value) * 100))
  })

  const buttonLabel = computed(() => {
    if (status.value === 'checking') return 'Checking'
    if (status.value === 'downloading')
      return progressPercent.value ? `${progressPercent.value}%` : 'Loading'
    if (status.value === 'installing') return 'Restart'
    return 'Update'
  })

  const tooltipLabel = computed(() =>
    busy.value ? `Updating SolaHub ${progressPercent.value ?? ''}`.trim() : 'Update SolaHub'
  )

  const progressStyle = computed(() => ({
    width: progressPercent.value ? `${progressPercent.value}%` : busy.value ? '28%' : '0%',
  }))

  const icon = computed(() => (busy.value ? RefreshCw : DownloadCloud))

  async function runUpdate(): Promise<void> {
    if (busy.value) return

    busy.value = true
    status.value = 'checking'
    downloadedBytes.value = 0
    contentLength.value = null
    rememberUpdateReturnRoute(route.fullPath)

    const onEvent = new Channel<UpdateDownloadEvent>((event) => {
      if (event.event === 'Started') {
        status.value = 'downloading'
        contentLength.value = event.data.contentLength ?? null
        return
      }
      if (event.event === 'Progress') {
        downloadedBytes.value += event.data.chunkLength
        return
      }
      status.value = 'installing'
    })

    try {
      const result = await invoke<AppUpdateResult>('install_app_update', { onEvent })
      clearUpdateReturnRoute()

      if (result.status === 'notConfigured') {
        toast.error(
          'Updates not configured',
          'Build SolaHub with a signed updater key to enable native updates.'
        )
      } else {
        toast.success('SolaHub is up to date', `Version ${result.currentVersion} is installed.`)
      }
    } catch (error) {
      clearUpdateReturnRoute()
      toast.error('Update failed', extractErrorMessage(error))
    } finally {
      busy.value = false
      status.value = 'idle'
      downloadedBytes.value = 0
      contentLength.value = null
    }
  }

  function extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return 'Please check your connection and try again.'
  }
</script>

<template>
  <button
    v-if="isTauri && !props.collapsed"
    type="button"
    data-no-drag
    :disabled="busy"
    :title="tooltipLabel"
    :aria-label="tooltipLabel"
    :class="[
      'relative h-8 min-w-[5.35rem] overflow-hidden rounded-md px-2.5',
      'inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-ink-strong shadow-xs',
      'border border-line bg-surface-raised hover:border-line-strong hover:bg-surface-canvas active:bg-surface-sunken',
      'dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-brand-400/30 dark:hover:bg-white/[0.06]',
      'transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
      'disabled:cursor-wait disabled:opacity-80',
      props.fullWidth && 'w-full',
    ]"
    @click="runUpdate"
  >
    <span
      v-if="busy"
      class="absolute inset-y-0 left-0 bg-brand-500/10 transition-[width] duration-200 dark:bg-brand-300/15"
      :style="progressStyle"
    />
    <component
      :is="icon"
      :class="[
        'relative h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-300',
        busy && 'animate-spin',
      ]"
    />
    <span class="relative tabular-nums">{{ buttonLabel }}</span>
  </button>

  <STooltip v-else-if="isTauri" :label="tooltipLabel" placement="right" data-no-drag>
    <button
      type="button"
      data-no-drag
      :disabled="busy"
      :aria-label="tooltipLabel"
      :class="[
        'relative h-8 w-8 overflow-hidden rounded-md text-brand-600 shadow-xs dark:text-brand-300',
        'inline-flex items-center justify-center',
        'border border-line bg-surface-raised hover:border-line-strong hover:bg-surface-canvas active:bg-surface-sunken',
        'dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-brand-400/30 dark:hover:bg-white/[0.06]',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
        'disabled:cursor-wait disabled:opacity-80',
      ]"
      @click="runUpdate"
    >
      <span
        v-if="busy"
        class="absolute inset-y-0 left-0 bg-brand-500/10 transition-[width] duration-200 dark:bg-brand-300/15"
        :style="progressStyle"
      />
      <component :is="icon" :class="['relative h-4 w-4', busy && 'animate-spin']" />
    </button>
  </STooltip>
</template>
