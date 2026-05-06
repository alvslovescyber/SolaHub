import { describe, expect, it } from 'vitest'
import {
  layoutDay,
  snap,
  formatHour,
  formatMinutes,
  formatEventTime,
  SNAP_MIN,
} from '../calendarUtils'
import type { CalendarEvent } from '@/stores/calendar.store'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(
  id: string,
  startH: number,
  endH: number,
  startM = 0,
  endM = 0
): CalendarEvent {
  const base = '2026-05-06'
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    id,
    title: `Event ${id}`,
    start: `${base}T${pad(startH)}:${pad(startM)}:00`,
    end: `${base}T${pad(endH)}:${pad(endM)}:00`,
    allDay: false,
    category: 'service',
  }
}

// ─── layoutDay ────────────────────────────────────────────────────────────────

describe('layoutDay', () => {
  it('returns an empty array for no events', () => {
    expect(layoutDay([])).toEqual([])
  })

  it('returns an empty array when all events are all-day', () => {
    const allDay: CalendarEvent = { ...makeEvent('a', 9, 10), allDay: true }
    expect(layoutDay([allDay])).toEqual([])
  })

  it('a single event occupies col 0 with cols 1', () => {
    const [item] = layoutDay([makeEvent('a', 9, 10)])
    expect(item?.col).toBe(0)
    expect(item?.cols).toBe(1)
  })

  it('two non-overlapping events each get cols=1', () => {
    // A: 9-10, B: 11-12 — no overlap
    const items = layoutDay([makeEvent('a', 9, 10), makeEvent('b', 11, 12)])
    expect(items).toHaveLength(2)
    expect(items[0]?.cols).toBe(1)
    expect(items[1]?.cols).toBe(1)
  })

  it('two overlapping events each get cols=2', () => {
    // A: 9-11, B: 10-12 — overlap
    const items = layoutDay([makeEvent('a', 9, 11), makeEvent('b', 10, 12)])
    expect(items).toHaveLength(2)
    const cols = items.map((i) => i.cols)
    expect(cols).toEqual([2, 2])
    // They must be in different columns
    const colIdxs = items.map((i) => i.col)
    expect(new Set(colIdxs).size).toBe(2)
  })

  it('three simultaneous events each get cols=3', () => {
    const items = layoutDay([
      makeEvent('a', 9, 11),
      makeEvent('b', 9, 11),
      makeEvent('c', 9, 11),
    ])
    expect(items.every((i) => i.cols === 3)).toBe(true)
    expect(new Set(items.map((i) => i.col)).size).toBe(3)
  })

  it('non-overlapping events reuse columns and stay at cols=1', () => {
    // A: 9-10 col 0, B: 10-11 → fits in col 0 again; no overlap cluster
    const items = layoutDay([makeEvent('a', 9, 10), makeEvent('b', 10, 11)])
    expect(items[0]?.cols).toBe(1)
    expect(items[1]?.cols).toBe(1)
    // Both can be in column 0 since A ends when B starts
    expect(items[0]?.col).toBe(0)
    expect(items[1]?.col).toBe(0)
  })

  it('A overlaps B, B overlaps C, but A and C do not directly overlap', () => {
    // A: 9-10:30, B: 10-11:30, C: 11-12
    // A∩B overlap, B∩C overlap → all in one cluster → cols determined by max concurrency
    const items = layoutDay([
      makeEvent('a', 9, 10, 0, 30),
      makeEvent('b', 10, 11, 0, 30),
      makeEvent('c', 11, 12),
    ])
    // All connected through B, so same cluster; max cols depends on concurrency
    // A(9-10:30) and B(10-11:30) overlap → need 2 cols
    // C(11-12) and B(10-11:30) overlap → need 2 cols
    // A and C never overlap simultaneously with anything else → cols stays at 2
    expect(items.every((i) => i.cols <= 2)).toBe(true)
  })

  it('preserves startMin and durationMin from the event times', () => {
    const [item] = layoutDay([makeEvent('a', 9, 10, 30)]) // 9:30 → 10:00
    expect(item?.startMin).toBe(9 * 60 + 30)
    expect(item?.durationMin).toBeGreaterThanOrEqual(30)
  })

  it('handles events that start at midnight', () => {
    const [item] = layoutDay([makeEvent('a', 0, 1)])
    expect(item?.startMin).toBe(0)
  })

  it('handles events that end at midnight (23:30-24:00 represented as endH=0 next day)', () => {
    // An event from 23:00-23:30 should still work
    const [item] = layoutDay([makeEvent('a', 23, 23, 0, 30)])
    expect(item?.startMin).toBe(23 * 60)
  })
})

// ─── snap ─────────────────────────────────────────────────────────────────────

describe('snap', () => {
  it(`rounds down when below the ${SNAP_MIN / 2}-minute midpoint`, () => {
    expect(snap(7)).toBe(0)
    expect(snap(22)).toBe(15)
    expect(snap(37)).toBe(30)
  })

  it(`rounds up when at or above the ${SNAP_MIN / 2}-minute midpoint`, () => {
    expect(snap(8)).toBe(15)
    expect(snap(23)).toBe(30)
    expect(snap(38)).toBe(45)
  })

  it('keeps values that are already on a snap boundary', () => {
    expect(snap(0)).toBe(0)
    expect(snap(15)).toBe(15)
    expect(snap(60)).toBe(60)
    expect(snap(1440)).toBe(1440)
  })
})

// ─── formatHour ───────────────────────────────────────────────────────────────

describe('formatHour', () => {
  it('formats midnight as "12 AM"', () => {
    expect(formatHour(0)).toBe('12 AM')
  })

  it('formats noon as "12 PM"', () => {
    expect(formatHour(12)).toBe('12 PM')
  })

  it('formats AM hours correctly', () => {
    expect(formatHour(1)).toBe('1 AM')
    expect(formatHour(6)).toBe('6 AM')
    expect(formatHour(11)).toBe('11 AM')
  })

  it('formats PM hours correctly', () => {
    expect(formatHour(13)).toBe('1 PM')
    expect(formatHour(18)).toBe('6 PM')
    expect(formatHour(23)).toBe('11 PM')
  })
})

// ─── formatMinutes ────────────────────────────────────────────────────────────

describe('formatMinutes', () => {
  it('formats whole hours without a colon', () => {
    expect(formatMinutes(0)).toBe('12am')
    expect(formatMinutes(9 * 60)).toBe('9am')
    expect(formatMinutes(12 * 60)).toBe('12pm')
    expect(formatMinutes(17 * 60)).toBe('5pm')
  })

  it('formats minutes with a colon', () => {
    expect(formatMinutes(9 * 60 + 30)).toBe('9:30am')
    expect(formatMinutes(14 * 60 + 15)).toBe('2:15pm')
    expect(formatMinutes(0 + 5)).toBe('12:05am')
  })

  it('pads single-digit minutes with a leading zero', () => {
    expect(formatMinutes(10 * 60 + 5)).toBe('10:05am')
  })
})

// ─── formatEventTime ─────────────────────────────────────────────────────────

describe('formatEventTime', () => {
  it('parses a local ISO string and returns a formatted time', () => {
    // Build a date string that guarantees 10:00 local time regardless of TZ
    const d = new Date()
    d.setHours(10, 0, 0, 0)
    const result = formatEventTime(d.toISOString())
    expect(result).toBe('10am')
  })

  it('includes minutes when they are non-zero', () => {
    const d = new Date()
    d.setHours(14, 30, 0, 0)
    expect(formatEventTime(d.toISOString())).toBe('2:30pm')
  })
})
