import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  isSameDay,
  parseISO,
} from 'date-fns'

export type EventCategory =
  | 'service'
  | 'speaker'
  | 'rehearsal'
  | 'prayer'
  | 'task'
  | 'meeting'
  | 'reading'
  | 'personal'

export type CalendarView = 'month' | 'week' | 'day' | 'agenda'

export interface CalendarEvent {
  id: string
  title: string
  start: string // ISO string
  end: string // ISO string
  allDay: boolean
  category: EventCategory
  location?: string
  description?: string
  speaker?: string
}

export const CATEGORY_CONFIG: Record<EventCategory, { label: string; color: string }> = {
  service: { label: 'Service', color: '#2563eb' },
  speaker: { label: 'Speaker', color: '#7c3aed' },
  rehearsal: { label: 'Rehearsal', color: '#ea580c' },
  prayer: { label: 'Prayer', color: '#16a34a' },
  task: { label: 'Task', color: '#475569' },
  meeting: { label: 'Meeting', color: '#0284c7' },
  reading: { label: 'Reading', color: '#b45309' },
  personal: { label: 'Personal', color: '#e11d48' },
}

const STORAGE_KEY = 'solahub:calendar:events:v2'

function readStorage(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as CalendarEvent[]
  } catch {
    // corrupted storage — start fresh
  }
  return []
}

export const useCalendarStore = defineStore('calendar', () => {
  // Lazy: only reads localStorage when the store is first instantiated
  const events = ref<CalendarEvent[]>(readStorage())
  const view = ref<CalendarView>('week')
  const currentDate = ref(new Date())

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.value))
  }

  const weekStart = computed(() => startOfWeek(currentDate.value, { weekStartsOn: 0 }))
  const weekEnd = computed(() => endOfWeek(currentDate.value, { weekStartsOn: 0 }))
  const monthStart = computed(() => startOfMonth(currentDate.value))
  const monthEnd = computed(() => endOfMonth(currentDate.value))

  const weekDays = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)))

  function eventsForDay(date: Date): CalendarEvent[] {
    return events.value.filter((e) => isSameDay(parseISO(e.start), date))
  }

  function navigate(direction: 'prev' | 'next') {
    const d = direction === 'next' ? 1 : -1
    if (view.value === 'month') currentDate.value = addMonths(currentDate.value, d)
    else if (view.value === 'week') currentDate.value = addWeeks(currentDate.value, d)
    else if (view.value === 'day') currentDate.value = addDays(currentDate.value, d)
    else currentDate.value = addWeeks(currentDate.value, d)
  }

  function goToToday() {
    currentDate.value = new Date()
  }

  function goToDate(date: Date) {
    currentDate.value = date
  }

  function addEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
    const newEvent: CalendarEvent = { ...event, id: crypto.randomUUID() }
    events.value.push(newEvent)
    persist()
    return newEvent
  }

  function updateEvent(id: string, updates: Partial<Omit<CalendarEvent, 'id'>>) {
    const idx = events.value.findIndex((e) => e.id === id)
    if (idx !== -1) {
      events.value[idx] = { ...events.value[idx], ...updates }
      persist()
    }
  }

  function deleteEvent(id: string) {
    events.value = events.value.filter((e) => e.id !== id)
    persist()
  }

  return {
    events,
    view,
    currentDate,
    weekDays,
    weekStart,
    weekEnd,
    monthStart,
    monthEnd,
    eventsForDay,
    navigate,
    goToToday,
    goToDate,
    addEvent,
    updateEvent,
    deleteEvent,
  }
})
