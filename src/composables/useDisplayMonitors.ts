import { ref, onMounted } from 'vue'
import { isTauri } from '@/lib/platform'

export interface DisplayMonitor {
  name: string
  width: number
  height: number
  scaleFactor: number
  isPrimary: boolean
}

const FALLBACK: DisplayMonitor = {
  name: 'Primary Display',
  width: typeof window !== 'undefined' ? window.screen.width : 1920,
  height: typeof window !== 'undefined' ? window.screen.height : 1080,
  scaleFactor: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  isPrimary: true,
}

export function useDisplayMonitors() {
  const monitors = ref<DisplayMonitor[]>([FALLBACK])
  const selectedMonitorIndex = ref(0)
  const loading = ref(false)

  function applyDetectedMonitors(detected: DisplayMonitor[]) {
    monitors.value = detected
    if (selectedMonitorIndex.value >= detected.length) selectedMonitorIndex.value = 0
    // Default to the secondary monitor if more than one (projector scenario)
    if (detected.length > 1 && selectedMonitorIndex.value === 0) selectedMonitorIndex.value = 1
  }

  async function detectMonitors() {
    loading.value = true
    try {
      if (isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core')
          const detected = await invoke<DisplayMonitor[]>('get_display_monitors')
          if (detected.length > 0) {
            applyDetectedMonitors(detected)
            return
          }
        } catch {
          // Fall back to Tauri's window API if the native display metadata command
          // is unavailable on the current platform or app version.
        }

        const { availableMonitors } = await import('@tauri-apps/api/window')
        const raw = await availableMonitors()
        if (raw.length > 0) {
          applyDetectedMonitors(
            raw.map((m, i) => ({
              name: m.name ?? `Monitor ${i + 1}`,
              width: m.size.width,
              height: m.size.height,
              scaleFactor: m.scaleFactor,
              isPrimary: i === 0,
            }))
          )
        }
      }
    } catch {
      // Tauri monitor API unavailable — keep fallback
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void detectMonitors()
  })

  return { monitors, selectedMonitorIndex, loading, detectMonitors }
}
