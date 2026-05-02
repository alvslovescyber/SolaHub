export type PlanStatus = 'Active' | 'Draft' | 'Archived' | 'Completed'

export type StatusTone = 'success' | 'neutral' | 'warning' | 'brand'

const STATUS_TONE: Record<PlanStatus, StatusTone> = {
  Active: 'success',
  Draft: 'neutral',
  Archived: 'warning',
  Completed: 'brand',
}

/**
 * Maps a reading-plan status string (as returned by the API) to the design-system
 * tone used by `SBadge`/`SChip`. Falls back to `neutral` for unknown values so
 * future API additions don't crash the UI.
 */
export function planStatusTone(status: string): StatusTone {
  return STATUS_TONE[status as PlanStatus] ?? 'neutral'
}
