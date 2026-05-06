import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '@/lib/platform'

const POLL_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours

interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  availableVersion: string | null
}

export const useUpdateStore = defineStore('update', () => {
  const hasUpdate = ref(false)
  const availableVersion = ref<string | null>(null)
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function check(): Promise<void> {
    if (!isTauri) return
    try {
      const result = await invoke<UpdateCheckResult>('check_app_update')
      hasUpdate.value = result.hasUpdate
      availableVersion.value = result.availableVersion
    } catch {
      // Silent — network errors shouldn't disrupt the user
    }
  }

  function startPolling(): void {
    stopPolling() // clear any existing timer before creating a new one
    void check()
    pollTimer = setInterval(() => void check(), POLL_INTERVAL_MS)
  }

  function stopPolling(): void {
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function clearUpdate(): void {
    hasUpdate.value = false
    availableVersion.value = null
  }

  return { hasUpdate, availableVersion, check, startPolling, stopPolling, clearUpdate }
})
