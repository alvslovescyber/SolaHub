<script setup lang="ts">
  import { computed } from 'vue'
  import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    isSameMonth,
    isSameDay,
    isToday,
    parseISO,
    format,
  } from 'date-fns'
  import type { CalendarEvent } from '@/stores/calendar.store'
  import { CATEGORY_CONFIG } from '@/stores/calendar.store'

  const props = defineProps<{
    currentDate: Date
    events: CalendarEvent[]
  }>()

  const emit = defineEmits<{
    'event-click': [event: CalendarEvent]
    'day-click': [date: Date]
    'event-update': [id: string, updates: Partial<CalendarEvent>]
  }>()

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const MAX_VISIBLE = 3

  const weeks = computed(() => {
    const monthS = startOfMonth(props.currentDate)
    const monthE = endOfMonth(props.currentDate)
    const gridStart = startOfWeek(monthS, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(monthE, { weekStartsOn: 0 })

    const weeks: Date[][] = []
    let cursor = gridStart
    while (cursor <= gridEnd) {
      weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)))
      cursor = addDays(cursor, 7)
    }
    return weeks
  })

  function dayEvents(date: Date): CalendarEvent[] {
    return props.events
      .filter((e) => isSameDay(parseISO(e.start), date))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }
</script>

<template>
  <div class="flex flex-col min-h-0 h-full">
    <!-- Day-of-week headers -->
    <div class="grid grid-cols-7 border-b border-line bg-surface-base shrink-0">
      <div
        v-for="day in DAYS"
        :key="day"
        class="py-2 text-center text-xs font-medium uppercase tracking-wide text-ink-muted border-r border-line-subtle last:border-r-0"
      >
        {{ day }}
      </div>
    </div>

    <!-- Weeks grid -->
    <div class="flex-1 grid overflow-hidden" :style="{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }">
      <div
        v-for="(week, wi) in weeks"
        :key="wi"
        class="grid grid-cols-7 border-b border-line last:border-b-0"
      >
        <div
          v-for="(day, di) in week"
          :key="di"
          :class="[
            'border-r border-line-subtle last:border-r-0 p-1 flex flex-col min-h-0 cursor-pointer group',
            !isSameMonth(day, currentDate) ? 'bg-surface-canvas' : 'bg-surface-base',
          ]"
          @click="emit('day-click', day)"
        >
          <!-- Date number -->
          <div class="flex items-center justify-end mb-0.5">
            <span
              :class="[
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                isToday(day)
                  ? 'bg-brand-500 text-white'
                  : isSameMonth(day, currentDate)
                    ? 'text-ink-strong group-hover:bg-surface-raised'
                    : 'text-ink-muted',
              ]"
            >
              {{ format(day, 'd') }}
            </span>
          </div>

          <!-- Events -->
          <div class="flex flex-col gap-px overflow-hidden">
            <template v-for="(event, ei) in dayEvents(day)" :key="event.id">
              <div
                v-if="ei < MAX_VISIBLE"
                class="rounded px-1 py-px text-xs font-medium truncate leading-4 text-white"
                :style="{ backgroundColor: CATEGORY_CONFIG[event.category].color }"
                @click.stop="emit('event-click', event)"
              >
                {{ event.allDay ? '' : format(parseISO(event.start), 'h:mma') + ' ' }}{{ event.title }}
              </div>
            </template>
            <div
              v-if="dayEvents(day).length > MAX_VISIBLE"
              class="text-xs text-ink-muted px-1 cursor-pointer hover:text-ink-base"
              @click.stop="emit('day-click', day)"
            >
              +{{ dayEvents(day).length - MAX_VISIBLE }} more
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
