import { describe, expect, it, beforeEach } from 'vitest'
import { useCalendarStore } from '../calendar.store'
import type { CalendarEvent } from '../calendar.store'
import { addDays, addMonths, addWeeks, format, startOfWeek } from 'date-fns'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'solahub:calendar:events:v2'

function makeEvent(overrides: Partial<CalendarEvent> = {}): Omit<CalendarEvent, 'id'> {
  return {
    title: 'Sunday Service',
    start: '2026-05-03T10:00:00.000Z',
    end: '2026-05-03T12:00:00.000Z',
    allDay: false,
    category: 'service',
    ...overrides,
  }
}

function isoDay(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// Clear localStorage before each test so stores always start empty
beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY)
})

// ─── addEvent ────────────────────────────────────────────────────────────────

describe('addEvent', () => {
  it('appends the event to the list', () => {
    const store = useCalendarStore()
    store.addEvent(makeEvent())
    expect(store.events).toHaveLength(1)
    expect(store.events[0]?.title).toBe('Sunday Service')
  })

  it('assigns a unique id to each event', () => {
    const store = useCalendarStore()
    const a = store.addEvent(makeEvent({ title: 'A' }))
    const b = store.addEvent(makeEvent({ title: 'B' }))
    expect(a.id).toBeTruthy()
    expect(b.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })

  it('returns the created event with its new id', () => {
    const store = useCalendarStore()
    const event = store.addEvent(makeEvent())
    expect(event).toMatchObject({ title: 'Sunday Service', category: 'service' })
    expect(typeof event.id).toBe('string')
  })

  it('persists to localStorage', () => {
    const store = useCalendarStore()
    store.addEvent(makeEvent())
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const saved = JSON.parse(raw!) as CalendarEvent[]
    expect(saved).toHaveLength(1)
  })
})

// ─── updateEvent ─────────────────────────────────────────────────────────────

describe('updateEvent', () => {
  it('updates fields on the matching event', () => {
    const store = useCalendarStore()
    const event = store.addEvent(makeEvent())
    store.updateEvent(event.id, { title: 'Updated Title' })
    expect(store.events[0]?.title).toBe('Updated Title')
  })

  it('does not alter other events', () => {
    const store = useCalendarStore()
    const a = store.addEvent(makeEvent({ title: 'A' }))
    const b = store.addEvent(makeEvent({ title: 'B' }))
    store.updateEvent(a.id, { title: 'A-updated' })
    expect(store.events.find((e) => e.id === b.id)?.title).toBe('B')
  })

  it('silently ignores an unknown id', () => {
    const store = useCalendarStore()
    store.addEvent(makeEvent())
    expect(() => store.updateEvent('nonexistent', { title: 'X' })).not.toThrow()
    expect(store.events[0]?.title).toBe('Sunday Service')
  })

  it('persists after update', () => {
    const store = useCalendarStore()
    const event = store.addEvent(makeEvent())
    store.updateEvent(event.id, { title: 'Persisted' })
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as CalendarEvent[]
    expect(saved[0]?.title).toBe('Persisted')
  })
})

// ─── deleteEvent ─────────────────────────────────────────────────────────────

describe('deleteEvent', () => {
  it('removes the event from the list', () => {
    const store = useCalendarStore()
    const event = store.addEvent(makeEvent())
    store.deleteEvent(event.id)
    expect(store.events).toHaveLength(0)
  })

  it('only removes the targeted event', () => {
    const store = useCalendarStore()
    const a = store.addEvent(makeEvent({ title: 'A' }))
    const b = store.addEvent(makeEvent({ title: 'B' }))
    store.deleteEvent(a.id)
    expect(store.events).toHaveLength(1)
    expect(store.events[0]?.id).toBe(b.id)
  })

  it('silently ignores an unknown id', () => {
    const store = useCalendarStore()
    store.addEvent(makeEvent())
    expect(() => store.deleteEvent('nonexistent')).not.toThrow()
    expect(store.events).toHaveLength(1)
  })

  it('persists the removal to localStorage', () => {
    const store = useCalendarStore()
    const event = store.addEvent(makeEvent())
    store.deleteEvent(event.id)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as CalendarEvent[]
    expect(saved).toHaveLength(0)
  })
})

// ─── navigate ────────────────────────────────────────────────────────────────

describe('navigate', () => {
  const ANCHOR = new Date('2026-05-06T12:00:00') // Wednesday

  beforeEach(() => {
    // Override currentDate to a fixed anchor so tests aren't date-sensitive
    const store = useCalendarStore()
    store.currentDate = new Date(ANCHOR)
  })

  it('week view: next moves forward by 7 days', () => {
    const store = useCalendarStore()
    store.view = 'week'
    store.navigate('next')
    expect(isoDay(store.currentDate)).toBe(isoDay(addWeeks(ANCHOR, 1)))
  })

  it('week view: prev moves back by 7 days', () => {
    const store = useCalendarStore()
    store.view = 'week'
    store.navigate('prev')
    expect(isoDay(store.currentDate)).toBe(isoDay(addWeeks(ANCHOR, -1)))
  })

  it('month view: next moves forward by 1 month', () => {
    const store = useCalendarStore()
    store.view = 'month'
    store.navigate('next')
    expect(isoDay(store.currentDate)).toBe(isoDay(addMonths(ANCHOR, 1)))
  })

  it('month view: prev moves back by 1 month', () => {
    const store = useCalendarStore()
    store.view = 'month'
    store.navigate('prev')
    expect(isoDay(store.currentDate)).toBe(isoDay(addMonths(ANCHOR, -1)))
  })

  it('day view: next moves forward by 1 day', () => {
    const store = useCalendarStore()
    store.view = 'day'
    store.navigate('next')
    expect(isoDay(store.currentDate)).toBe(isoDay(addDays(ANCHOR, 1)))
  })

  it('day view: prev moves back by 1 day', () => {
    const store = useCalendarStore()
    store.view = 'day'
    store.navigate('prev')
    expect(isoDay(store.currentDate)).toBe(isoDay(addDays(ANCHOR, -1)))
  })

  it('agenda view: next moves forward by 7 days', () => {
    const store = useCalendarStore()
    store.view = 'agenda'
    store.navigate('next')
    expect(isoDay(store.currentDate)).toBe(isoDay(addWeeks(ANCHOR, 1)))
  })
})

// ─── goToToday / goToDate ─────────────────────────────────────────────────────

describe('goToToday', () => {
  it('resets currentDate to today', () => {
    const store = useCalendarStore()
    store.currentDate = new Date('2020-01-01')
    store.goToToday()
    expect(isoDay(store.currentDate)).toBe(isoDay(new Date()))
  })
})

describe('goToDate', () => {
  it('sets currentDate to the given date', () => {
    const store = useCalendarStore()
    const target = new Date('2026-12-25')
    store.goToDate(target)
    expect(isoDay(store.currentDate)).toBe('2026-12-25')
  })
})

// ─── weekDays ─────────────────────────────────────────────────────────────────

describe('weekDays', () => {
  it('returns exactly 7 dates', () => {
    const store = useCalendarStore()
    expect(store.weekDays).toHaveLength(7)
  })

  it('starts on Sunday', () => {
    const store = useCalendarStore()
    store.currentDate = new Date('2026-05-06') // Wednesday
    const sunday = startOfWeek(new Date('2026-05-06'), { weekStartsOn: 0 })
    expect(isoDay(store.weekDays[0]!)).toBe(isoDay(sunday))
  })

  it('ends on Saturday', () => {
    const store = useCalendarStore()
    store.currentDate = new Date('2026-05-06')
    const sunday = startOfWeek(new Date('2026-05-06'), { weekStartsOn: 0 })
    expect(isoDay(store.weekDays[6]!)).toBe(isoDay(addDays(sunday, 6)))
  })
})

// ─── eventsForDay ─────────────────────────────────────────────────────────────

describe('eventsForDay', () => {
  it('returns events whose start falls on the given date', () => {
    const store = useCalendarStore()
    const sunday = store.addEvent(makeEvent({ start: '2026-05-03T10:00:00.000Z' }))
    const monday = store.addEvent(makeEvent({ start: '2026-05-04T10:00:00.000Z' }))

    const results = store.eventsForDay(new Date('2026-05-03'))
    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe(sunday.id)
    void monday
  })

  it('returns an empty array for a day with no events', () => {
    const store = useCalendarStore()
    store.addEvent(makeEvent({ start: '2026-05-03T10:00:00.000Z' }))
    expect(store.eventsForDay(new Date('2026-05-10'))).toHaveLength(0)
  })

  it('returns multiple events on the same day', () => {
    const store = useCalendarStore()
    store.addEvent(makeEvent({ start: '2026-05-03T09:00:00.000Z' }))
    store.addEvent(makeEvent({ start: '2026-05-03T14:00:00.000Z' }))
    expect(store.eventsForDay(new Date('2026-05-03'))).toHaveLength(2)
  })
})

// ─── localStorage ────────────────────────────────────────────────────────────

describe('localStorage resilience', () => {
  it('starts with an empty list when storage is empty', () => {
    localStorage.removeItem(STORAGE_KEY)
    const store = useCalendarStore()
    expect(store.events).toHaveLength(0)
  })

  it('loads previously saved events on initialisation', () => {
    const saved: CalendarEvent[] = [
      { ...makeEvent(), id: 'saved-1' } as CalendarEvent,
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const store = useCalendarStore()
    expect(store.events).toHaveLength(1)
    expect(store.events[0]?.id).toBe('saved-1')
  })

  it('starts empty when storage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{ not valid json }}}')
    const store = useCalendarStore()
    expect(store.events).toHaveLength(0)
  })
})
