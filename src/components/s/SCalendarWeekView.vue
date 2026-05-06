<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { format, isSameDay, parseISO, isToday } from 'date-fns'
  import { MapPin, User } from 'lucide-vue-next'
  import type { CalendarEvent } from '@/stores/calendar.store'
  import { CATEGORY_CONFIG } from '@/stores/calendar.store'
  import {
    layoutDay,
    snap,
    formatHour,
    formatMinutes,
    formatEventTime,
    HOUR_HEIGHT,
    PX_PER_MIN,
    SNAP_MIN,
  } from '@/utils/calendarUtils'

  const props = defineProps<{
    days: Date[]
    events: CalendarEvent[]
  }>()

  const emit = defineEmits<{
    'event-click': [event: CalendarEvent]
    'event-update': [id: string, updates: Partial<CalendarEvent>]
    'slot-click': [date: Date, hour: number, minute: number]
  }>()

  const MIN_VISUAL_PX = 24
  const TIME_COL_W = 56
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const gridBodyRef = ref<HTMLElement>()

  // ─── Current time ──────────────────────────────────────────────────────────
  const nowMin = ref(new Date().getHours() * 60 + new Date().getMinutes())
  let nowInterval: ReturnType<typeof setInterval>

  onMounted(() => {
    nowInterval = setInterval(() => {
      nowMin.value = new Date().getHours() * 60 + new Date().getMinutes()
    }, 60_000)
    if (gridBodyRef.value) gridBodyRef.value.scrollTop = 7 * HOUR_HEIGHT
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  })

  onUnmounted(() => {
    clearInterval(nowInterval)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  })

  // ─── Day layouts ───────────────────────────────────────────────────────────
  const dayLayouts = computed(() =>
    props.days.map((day) => {
      const dayEvents = props.events.filter((e) => !e.allDay && isSameDay(parseISO(e.start), day))
      return layoutDay(dayEvents)
    })
  )

  const allDayByDay = computed(() =>
    props.days.map((day) =>
      props.events.filter((e) => e.allDay && isSameDay(parseISO(e.start), day))
    )
  )

  // ─── Drag-to-move ──────────────────────────────────────────────────────────
  interface DragState {
    eventId: string
    durationMin: number
    grabOffsetMin: number
    ghost: { dayIdx: number; startMin: number }
  }

  const drag = ref<DragState | null>(null)

  // Computed so the template doesn't call .find() on every render tick
  const draggedEvent = computed<CalendarEvent | null>(() => {
    if (!drag.value) return null
    return props.events.find((e) => e.id === drag.value!.eventId) ?? null
  })

  function onEventMouseDown(e: MouseEvent, event: CalendarEvent, dayIdx: number) {
    if ((e.target as HTMLElement).closest('.resize-handle')) return
    e.preventDefault()
    e.stopPropagation()

    const start = new Date(event.start)
    const end = new Date(event.end)
    const startMin = start.getHours() * 60 + start.getMinutes()
    const durationMin = Math.max((end.getTime() - start.getTime()) / 60_000, 15)
    const grabOffsetMin = (e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top) / PX_PER_MIN

    drag.value = { eventId: event.id, durationMin, grabOffsetMin, ghost: { dayIdx, startMin } }
  }

  // ─── Drag-to-resize ────────────────────────────────────────────────────────
  interface ResizeState {
    eventId: string
    startMin: number
    dayIdx: number
    currentEndMin: number
  }

  const resize = ref<ResizeState | null>(null)

  function onResizeMouseDown(e: MouseEvent, event: CalendarEvent, dayIdx: number) {
    e.preventDefault()
    e.stopPropagation()
    const start = new Date(event.start)
    const end = new Date(event.end)
    resize.value = {
      eventId: event.id,
      startMin: start.getHours() * 60 + start.getMinutes(),
      dayIdx,
      currentEndMin: end.getHours() * 60 + end.getMinutes(),
    }
  }

  // ─── Grid coordinate helper ────────────────────────────────────────────────
  function getGridCoords(e: MouseEvent): { dayIdx: number; minutes: number } | null {
    const el = gridBodyRef.value
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const relY = e.clientY - rect.top + el.scrollTop
    const relX = e.clientX - rect.left - TIME_COL_W
    const dayW = (rect.width - TIME_COL_W) / props.days.length
    const dayIdx = Math.floor(relX / dayW)
    if (dayIdx < 0 || dayIdx >= props.days.length) return null
    return { dayIdx, minutes: Math.max(0, Math.min(relY / PX_PER_MIN, 24 * 60 - 1)) }
  }

  function onMouseMove(e: MouseEvent) {
    if (drag.value) {
      const coords = getGridCoords(e)
      if (!coords) return
      const rawStart = coords.minutes - drag.value.grabOffsetMin
      drag.value.ghost = {
        dayIdx: coords.dayIdx,
        startMin: Math.max(0, Math.min(snap(rawStart), 24 * 60 - drag.value.durationMin)),
      }
      return
    }
    if (resize.value) {
      const coords = getGridCoords(e)
      if (!coords) return
      resize.value.currentEndMin = Math.min(
        Math.max(resize.value.startMin + SNAP_MIN, snap(coords.minutes)),
        24 * 60
      )
    }
  }

  function onMouseUp() {
    if (drag.value) {
      const { eventId, ghost, durationMin } = drag.value
      const targetDay = props.days[ghost.dayIdx]
      if (targetDay) {
        const newStart = new Date(targetDay)
        newStart.setHours(Math.floor(ghost.startMin / 60), ghost.startMin % 60, 0, 0)
        const newEnd = new Date(newStart.getTime() + durationMin * 60_000)
        emit('event-update', eventId, { start: newStart.toISOString(), end: newEnd.toISOString() })
      }
      drag.value = null
    }
    if (resize.value) {
      const { eventId, startMin, dayIdx, currentEndMin } = resize.value
      const targetDay = props.days[dayIdx]
      if (targetDay) {
        const newEnd = new Date(targetDay)
        newEnd.setHours(Math.floor(currentEndMin / 60), currentEndMin % 60, 0, 0)
        emit('event-update', eventId, { end: newEnd.toISOString() })
      }
      resize.value = null
    }
  }

  // ─── Slot click (create) ───────────────────────────────────────────────────
  function onSlotClick(e: MouseEvent, dayIdx: number) {
    if (drag.value || resize.value) return
    if ((e.target as HTMLElement).closest('.cal-event')) return
    const coords = getGridCoords(e)
    if (!coords) return
    const snapped = snap(coords.minutes)
    emit('slot-click', props.days[dayIdx], Math.floor(snapped / 60), snapped % 60)
  }

  // ─── Style helpers ─────────────────────────────────────────────────────────
  function eventStyle(item: ReturnType<typeof layoutDay>[number]): Record<string, string> {
    const isDragged = drag.value?.eventId === item.event.id
    let heightMin = item.durationMin
    if (resize.value?.eventId === item.event.id) {
      heightMin = resize.value.currentEndMin - item.startMin
    }
    const colW = 100 / item.cols
    return {
      top: `${Math.floor(item.startMin * PX_PER_MIN)}px`,
      height: `${Math.max(Math.floor(heightMin * PX_PER_MIN), MIN_VISUAL_PX)}px`,
      left: `${item.col * colW + 0.5}%`,
      width: `calc(${colW}% - 4px)`,
      backgroundColor: CATEGORY_CONFIG[item.event.category].color,
      opacity: isDragged ? '0.25' : '1',
      cursor: isDragged ? 'grabbing' : 'grab',
      zIndex: isDragged ? '1' : '10',
    }
  }

  function ghostStyle(ghost: DragState['ghost']): Record<string, string> {
    if (!drag.value || !draggedEvent.value) return {}
    return {
      top: `${Math.floor(ghost.startMin * PX_PER_MIN)}px`,
      height: `${Math.max(Math.floor(drag.value.durationMin * PX_PER_MIN), MIN_VISUAL_PX)}px`,
      left: '3px',
      right: '3px',
      backgroundColor: CATEGORY_CONFIG[draggedEvent.value.category].color,
      opacity: '0.85',
    }
  }
</script>

<template>
  <div class="flex flex-col min-h-0 h-full select-none">
    <!-- ── Day header row ───────────────────────────────────────────── -->
    <div class="flex shrink-0 border-b border-line bg-surface-base">
      <div :style="{ width: TIME_COL_W + 'px' }" class="shrink-0 border-r border-line" />
      <div
        v-for="(day, idx) in days"
        :key="idx"
        class="flex-1 flex flex-col items-center py-2 border-r border-line last:border-r-0"
      >
        <span class="text-xs uppercase tracking-wider text-ink-muted font-medium">
          {{ format(day, 'EEE') }}
        </span>
        <button
          :class="[
            'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mt-0.5 transition-colors',
            isToday(day) ? 'bg-brand-500 text-white' : 'text-ink-strong hover:bg-surface-raised',
          ]"
          @click="emit('slot-click', day, 8, 0)"
        >
          {{ format(day, 'd') }}
        </button>
      </div>
    </div>

    <!-- ── All-day row ──────────────────────────────────────────────── -->
    <div
      v-if="allDayByDay.some((d) => d.length)"
      class="flex shrink-0 border-b border-line bg-surface-base"
    >
      <div
        :style="{ width: TIME_COL_W + 'px' }"
        class="shrink-0 border-r border-line flex items-center justify-end pr-2"
      >
        <span class="text-[10px] text-ink-muted">all-day</span>
      </div>
      <div
        v-for="(dayEvents, idx) in allDayByDay"
        :key="idx"
        class="flex-1 border-r border-line last:border-r-0 py-1 px-1 flex flex-col gap-0.5"
      >
        <div
          v-for="event in dayEvents"
          :key="event.id"
          class="rounded px-1.5 py-0.5 text-xs font-medium truncate text-white cursor-pointer"
          :style="{ backgroundColor: CATEGORY_CONFIG[event.category].color }"
          @click="emit('event-click', event)"
        >
          {{ event.title }}
        </div>
      </div>
    </div>

    <!-- ── Scrollable time grid ─────────────────────────────────────── -->
    <div ref="gridBodyRef" class="flex-1 overflow-y-auto min-h-0">
      <div class="flex" :style="{ height: 24 * HOUR_HEIGHT + 'px' }">
        <!-- Time labels -->
        <div
          :style="{ width: TIME_COL_W + 'px', minWidth: TIME_COL_W + 'px' }"
          class="shrink-0 border-r border-line bg-surface-base"
        >
          <div
            v-for="h in hours"
            :key="h"
            :style="{ height: HOUR_HEIGHT + 'px' }"
            class="flex items-start justify-end pr-2 pt-0.5"
          >
            <span class="text-[11px] leading-none text-ink-muted select-none">
              {{ h === 0 ? '' : formatHour(h) }}
            </span>
          </div>
        </div>

        <!-- Day columns -->
        <div class="flex flex-1 min-w-0">
          <div
            v-for="(day, dayIdx) in days"
            :key="dayIdx"
            class="flex-1 relative border-r border-line last:border-r-0 bg-surface-base"
            :style="{ minHeight: 24 * HOUR_HEIGHT + 'px' }"
            @click="onSlotClick($event, dayIdx)"
          >
            <!-- Hour lines -->
            <div
              v-for="h in hours"
              :key="h"
              :style="{ top: h * HOUR_HEIGHT + 'px' }"
              class="absolute inset-x-0 h-px bg-line"
            />
            <!-- Half-hour lines -->
            <div
              v-for="h in hours"
              :key="'hh' + h"
              :style="{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 + 'px' }"
              class="absolute inset-x-0 h-px bg-line-subtle/50"
            />

            <!-- Today column tint -->
            <div
              v-if="isToday(day)"
              class="absolute inset-0 bg-brand-500/[0.03] pointer-events-none"
            />

            <!-- Current time indicator -->
            <div
              v-if="isToday(day)"
              :style="{ top: nowMin * PX_PER_MIN + 'px' }"
              class="absolute inset-x-0 z-20 flex items-center pointer-events-none -translate-y-px"
            >
              <div class="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow-sm" />
              <div class="flex-1 h-0.5 bg-red-500" />
            </div>

            <!-- Timed events -->
            <div
              v-for="item in dayLayouts[dayIdx]"
              :key="item.event.id"
              class="absolute rounded-md px-2 pt-1 pb-3 overflow-hidden cal-event text-white"
              :style="eventStyle(item)"
              @mousedown="onEventMouseDown($event, item.event, dayIdx)"
              @click.stop="emit('event-click', item.event)"
            >
              <div class="font-semibold text-xs leading-snug truncate">{{ item.event.title }}</div>
              <div
                v-if="item.durationMin * PX_PER_MIN >= 36"
                class="text-[11px] leading-snug truncate opacity-85 mt-0.5"
              >
                {{ formatEventTime(item.event.start) }}
                <template v-if="item.event.speaker">
                  &middot; {{ item.event.speaker }}
                </template>
              </div>
              <div
                v-if="item.durationMin * PX_PER_MIN >= 52 && item.event.location"
                class="flex items-center gap-0.5 text-[11px] leading-snug truncate opacity-80 mt-0.5"
              >
                <MapPin class="h-2.5 w-2.5 shrink-0" />{{ item.event.location }}
              </div>
              <!-- Resize handle -->
              <div
                class="resize-handle absolute bottom-0 inset-x-0 h-2 cursor-s-resize group/resize"
                @mousedown.stop.prevent="onResizeMouseDown($event, item.event, dayIdx)"
              >
                <div
                  class="mx-auto w-5 h-0.5 rounded bg-white/40 group-hover/resize:bg-white/70 mt-0.5"
                />
              </div>
            </div>

            <!-- Drag ghost -->
            <div
              v-if="drag && drag.ghost.dayIdx === dayIdx && draggedEvent"
              class="absolute rounded-md px-2 pt-1 overflow-hidden pointer-events-none ring-2 ring-white/60 text-white z-30"
              :style="ghostStyle(drag.ghost)"
            >
              <div class="font-semibold text-xs leading-snug truncate">
                {{ draggedEvent.title }}
              </div>
              <div class="text-[11px] opacity-85 mt-0.5">
                {{ formatMinutes(drag.ghost.startMin) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
