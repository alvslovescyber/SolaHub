<script setup lang="ts">
  import { computed } from 'vue'
  import { addDays, isSameDay, parseISO, format, isToday, isTomorrow } from 'date-fns'
  import { Clock, MapPin, User } from 'lucide-vue-next'
  import type { CalendarEvent } from '@/stores/calendar.store'
  import { CATEGORY_CONFIG } from '@/stores/calendar.store'

  const props = defineProps<{
    fromDate: Date
    events: CalendarEvent[]
  }>()

  const emit = defineEmits<{
    'event-click': [event: CalendarEvent]
  }>()

  // Show 28 days ahead
  const days = computed(() => Array.from({ length: 28 }, (_, i) => addDays(props.fromDate, i)))

  const grouped = computed(() =>
    days.value
      .map((day) => ({
        day,
        events: props.events
          .filter((e) => isSameDay(parseISO(e.start), day))
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
      }))
      .filter((g) => g.events.length > 0)
  )

  function dayLabel(date: Date): string {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEEE, MMMM d')
  }

  function timeRange(event: CalendarEvent): string {
    if (event.allDay) return 'All day'
    const s = parseISO(event.start)
    const e = parseISO(event.end)
    return `${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`
  }
</script>

<template>
  <div class="flex flex-col gap-0 overflow-y-auto">
    <div v-if="!grouped.length" class="flex flex-col items-center justify-center py-16 text-ink-muted">
      <Clock class="h-8 w-8 mb-3 opacity-40" />
      <p class="text-sm">No events in the next 28 days</p>
    </div>

    <div v-for="group in grouped" :key="group.day.toISOString()">
      <!-- Date heading -->
      <div
        :class="[
          'sticky top-0 z-10 px-4 py-2 border-b border-line text-sm font-semibold bg-surface-canvas',
          isToday(group.day) ? 'text-brand-600' : 'text-ink-strong',
        ]"
      >
        {{ dayLabel(group.day) }}
      </div>

      <!-- Events for this day -->
      <div
        v-for="event in group.events"
        :key="event.id"
        class="flex items-start gap-3 px-4 py-3 border-b border-line-subtle hover:bg-surface-raised cursor-pointer transition-colors"
        @click="emit('event-click', event)"
      >
        <!-- Category stripe -->
        <div
          class="w-1 self-stretch rounded-full shrink-0 mt-0.5"
          :style="{ backgroundColor: CATEGORY_CONFIG[event.category].color }"
        />

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <span class="font-medium text-sm text-ink-strong truncate">{{ event.title }}</span>
            <span
              class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium text-white"
              :style="{ backgroundColor: CATEGORY_CONFIG[event.category].color }"
            >
              {{ CATEGORY_CONFIG[event.category].label }}
            </span>
          </div>

          <div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            <span class="flex items-center gap-1 text-xs text-ink-muted">
              <Clock class="h-3 w-3" />
              {{ timeRange(event) }}
            </span>
            <span v-if="event.location" class="flex items-center gap-1 text-xs text-ink-muted">
              <MapPin class="h-3 w-3" />
              {{ event.location }}
            </span>
            <span v-if="event.speaker" class="flex items-center gap-1 text-xs text-ink-muted">
              <User class="h-3 w-3" />
              {{ event.speaker }}
            </span>
          </div>

          <p v-if="event.description" class="text-xs text-ink-muted mt-1 line-clamp-2">
            {{ event.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
