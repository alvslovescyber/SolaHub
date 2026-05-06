import type { CalendarEvent } from '@/stores/calendar.store'

// ─── Grid constants ──────────────────────────────────────────────────────────
export const HOUR_HEIGHT = 64 // px per hour
export const PX_PER_MIN = HOUR_HEIGHT / 60
export const SNAP_MIN = 15
export const MIN_DURATION_MIN = HOUR_HEIGHT / PX_PER_MIN / PX_PER_MIN // ≈22.5 min visual floor

export interface LayoutEvent {
  event: CalendarEvent
  startMin: number
  durationMin: number
  col: number
  cols: number
}

/**
 * Assigns each timed event a column and width for a single day's time grid.
 *
 * Uses a column-sweep to place events, then union-find to determine the
 * maximum concurrency (cols) within each overlap cluster so that non-
 * overlapping events are never needlessly narrowed.
 */
export function layoutDay(
  dayEvents: CalendarEvent[],
  minDurationMin = MIN_DURATION_MIN
): LayoutEvent[] {
  const timed = dayEvents.filter((e) => !e.allDay)
  if (!timed.length) return []

  const sorted = [...timed].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  // Step 1 – assign columns via sweep
  const colEnds: number[] = []
  const placed: { event: CalendarEvent; startMin: number; endMin: number; col: number }[] = []

  for (const event of sorted) {
    const s = new Date(event.start)
    const e = new Date(event.end)
    const startMin = s.getHours() * 60 + s.getMinutes()
    const rawEndMin = e.getHours() * 60 + e.getMinutes()
    const endMin = Math.max(rawEndMin, startMin + minDurationMin)

    let col = colEnds.findIndex((end) => end <= startMin)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(0)
    }
    colEnds[col] = endMin
    placed.push({ event, startMin, endMin, col })
  }

  // Step 2 – union-find: group events that overlap into clusters
  const parent = placed.map((_, i) => i)

  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]!
      i = parent[i]!
    }
    return i
  }

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      if (placed[j]!.startMin < placed[i]!.endMin) {
        // j starts before i ends → they overlap
        const ri = find(i)
        const rj = find(j)
        if (ri !== rj) parent[ri] = rj
      } else {
        break // sorted by start, no further overlaps possible
      }
    }
  }

  // Step 3 – max col index per cluster → cols width denominator
  const clusterMaxCol = new Map<number, number>()
  for (let i = 0; i < placed.length; i++) {
    const root = find(i)
    clusterMaxCol.set(root, Math.max(clusterMaxCol.get(root) ?? 0, placed[i]!.col))
  }

  return placed.map((p, i) => ({
    event: p.event,
    startMin: p.startMin,
    durationMin: p.endMin - p.startMin,
    col: p.col,
    cols: (clusterMaxCol.get(find(i)) ?? 0) + 1,
  }))
}

/** Snap a minute value to the nearest SNAP_MIN interval. */
export function snap(minutes: number): number {
  return Math.round(minutes / SNAP_MIN) * SNAP_MIN
}

/** Format an hour index (0-23) as a readable label: "12 AM", "1 PM", etc. */
export function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

/**
 * Format a total-minutes-from-midnight value as a short time string.
 * e.g. 540 → "9am", 570 → "9:30am"
 */
export function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const suffix = h >= 12 ? 'pm' : 'am'
  const hh = h % 12 || 12
  return m === 0 ? `${hh}${suffix}` : `${hh}:${String(m).padStart(2, '0')}${suffix}`
}

/**
 * Format an ISO datetime string as a short time label.
 * e.g. "2026-05-06T10:00:00Z" → "10am"
 */
export function formatEventTime(isoStr: string): string {
  const d = new Date(isoStr)
  return formatMinutes(d.getHours() * 60 + d.getMinutes())
}
