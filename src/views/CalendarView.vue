<script setup lang="ts">
  import { ref, computed } from 'vue'
  import {
    format,
    startOfWeek,
    addDays,
    addMonths,
    startOfMonth,
    endOfMonth,
    isSameMonth,
    isSameDay,
    isToday,
  } from 'date-fns'
  import {
    ChevronLeft,
    ChevronRight,
    Plus,
    CalendarDays,
    LayoutList,
    Grid3x3,
    Columns,
  } from 'lucide-vue-next'
  import {
    SButton,
    SIconButton,
    STopBar,
  } from '@/components/s'
  import SCalendarWeekView from '@/components/s/SCalendarWeekView.vue'
  import SCalendarMonthView from '@/components/s/SCalendarMonthView.vue'
  import SCalendarAgendaView from '@/components/s/SCalendarAgendaView.vue'
  import SCalendarEventModal from '@/components/s/SCalendarEventModal.vue'
  import { useCalendarStore, type CalendarEvent, type CalendarView, CATEGORY_CONFIG } from '@/stores/calendar.store'

  const store = useCalendarStore()

  // ─── Modal state ─────────────────────────────────────────────────────────
  const modalOpen = ref(false)
  const editingEvent = ref<CalendarEvent | null>(null)
  const defaultStart = ref<Date | undefined>()
  const defaultEnd = ref<Date | undefined>()

  function openCreate(start?: Date, h = 9, m = 0) {
    const s = start ? new Date(start) : new Date()
    s.setHours(h, m, 0, 0)
    const e = new Date(s.getTime() + 60 * 60 * 1000)
    defaultStart.value = s
    defaultEnd.value = e
    editingEvent.value = null
    modalOpen.value = true
  }

  function openEdit(event: CalendarEvent) {
    editingEvent.value = event
    defaultStart.value = undefined
    defaultEnd.value = undefined
    modalOpen.value = true
  }

  function closeModal() {
    modalOpen.value = false
    editingEvent.value = null
  }

  function handleSave(data: Omit<CalendarEvent, 'id'>) {
    if (editingEvent.value) {
      store.updateEvent(editingEvent.value.id, data)
    } else {
      store.addEvent(data)
    }
    closeModal()
  }

  function handleDelete(id: string) {
    store.deleteEvent(id)
    closeModal()
  }

  function handleEventUpdate(id: string, updates: Partial<CalendarEvent>) {
    store.updateEvent(id, updates)
  }

  function handleSlotClick(date: Date, hour: number, minute: number) {
    openCreate(date, hour, minute)
  }

  function handleDayClick(date: Date) {
    store.goToDate(date)
    store.view = 'day'
  }

  // ─── View label ──────────────────────────────────────────────────────────
  const viewLabel = computed(() => {
    const d = store.currentDate
    if (store.view === 'month') return format(d, 'MMMM yyyy')
    if (store.view === 'week') {
      const ws = startOfWeek(d, { weekStartsOn: 0 })
      const we = addDays(ws, 6)
      if (isSameMonth(ws, we)) return format(ws, 'MMMM yyyy')
      return `${format(ws, 'MMM')} – ${format(we, 'MMM yyyy')}`
    }
    if (store.view === 'day') return format(d, 'EEEE, MMMM d, yyyy')
    return 'Upcoming'
  })

  // ─── Week/day view days array ─────────────────────────────────────────────
  const viewDays = computed(() => {
    if (store.view === 'week') return store.weekDays
    if (store.view === 'day') return [store.currentDate]
    return []
  })

  // ─── Mini-month calendar (left panel) ────────────────────────────────────
  const miniDate = ref(new Date())

  const miniWeeks = computed(() => {
    const ms = startOfMonth(miniDate.value)
    const me = endOfMonth(miniDate.value)
    const gs = startOfWeek(ms, { weekStartsOn: 0 })
    const weeks: Date[][] = []
    let c = gs
    while (c <= me) {
      weeks.push(Array.from({ length: 7 }, (_, i) => addDays(c, i)))
      c = addDays(c, 7)
    }
    return weeks
  })

  function miniNavigate(d: number) {
    miniDate.value = addMonths(miniDate.value, d)
  }

  function miniDayClick(date: Date) {
    store.goToDate(date)
    if (store.view === 'month') return
    if (store.view === 'agenda') store.view = 'day'
  }

  type ViewOption = { id: CalendarView; label: string; icon: typeof CalendarDays }
  const viewOptions: ViewOption[] = [
    { id: 'day', label: 'Day', icon: CalendarDays },
    { id: 'week', label: 'Week', icon: Columns },
    { id: 'month', label: 'Month', icon: Grid3x3 },
    { id: 'agenda', label: 'Agenda', icon: LayoutList },
  ]
</script>

<template>
  <div class="flex flex-col flex-1 min-w-0 min-h-0 h-full">
    <!-- ── Top bar ──────────────────────────────────────────────────────── -->
    <STopBar title="Calendar" subtitle="Church services, events, and speakers">
      <template #actions>
        <SButton size="sm" variant="primary" @click="openCreate()">
          <template #leading>
            <Plus class="h-3.5 w-3.5" />
          </template>
          New event
        </SButton>
      </template>
    </STopBar>

    <!-- ── Main layout ─────────────────────────────────────────────────── -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- ── Left sidebar ─────────────────────────────────────────────── -->
      <div class="w-52 shrink-0 border-r border-line flex flex-col gap-4 pt-4 px-3 bg-surface-base overflow-y-auto">
        <!-- Nav controls -->
        <div class="flex items-center justify-between gap-1">
          <SIconButton size="sm" label="Previous" @click="miniNavigate(-1)">
            <ChevronLeft class="h-3.5 w-3.5" />
          </SIconButton>
          <span class="text-xs font-semibold text-ink-strong">
            {{ format(miniDate, 'MMM yyyy') }}
          </span>
          <SIconButton size="sm" label="Next" @click="miniNavigate(1)">
            <ChevronRight class="h-3.5 w-3.5" />
          </SIconButton>
        </div>

        <!-- Mini month grid -->
        <div class="grid grid-cols-7 gap-px">
          <div
            v-for="(d, i) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
            :key="i"
            class="text-center text-[10px] text-ink-muted font-medium pb-1"
          >
            {{ d }}
          </div>
          <template v-for="week in miniWeeks" :key="week[0].toISOString()">
            <button
              v-for="day in week"
              :key="day.toISOString()"
              :class="[
                'text-[11px] rounded-full aspect-square flex items-center justify-center transition-colors',
                isToday(day) ? 'bg-brand-500 text-white font-bold' :
                isSameDay(day, store.currentDate) ? 'bg-brand-100 text-brand-700 font-semibold' :
                !isSameMonth(day, miniDate) ? 'text-ink-muted/40' :
                'text-ink-base hover:bg-surface-raised',
              ]"
              @click="miniDayClick(day)"
            >
              {{ format(day, 'd') }}
            </button>
          </template>
        </div>

        <!-- View selector -->
        <div class="flex flex-col gap-0.5">
          <p class="text-[10px] uppercase tracking-widest text-ink-muted font-semibold mb-1 px-1">View</p>
          <button
            v-for="opt in viewOptions"
            :key="opt.id"
            :class="[
              'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors w-full text-left',
              store.view === opt.id
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-base hover:bg-surface-raised',
            ]"
            @click="store.view = opt.id"
          >
            <component :is="opt.icon" class="h-3.5 w-3.5 shrink-0" />
            {{ opt.label }}
          </button>
        </div>

        <!-- Category legend -->
        <div class="flex flex-col gap-0.5">
          <p class="text-[10px] uppercase tracking-widest text-ink-muted font-semibold mb-1 px-1">Categories</p>
          <div
            v-for="(cfg, key) in CATEGORY_CONFIG"
            :key="key"
            class="flex items-center gap-2 px-2 py-1 text-xs text-ink-base"
          >
            <div class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: cfg.color }" />
            {{ cfg.label }}
          </div>
        </div>
      </div>

      <!-- ── Calendar content ──────────────────────────────────────────── -->
      <div class="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <!-- Toolbar -->
        <div class="flex items-center gap-2 px-4 py-2 border-b border-line shrink-0 bg-surface-base">
          <SButton size="sm" variant="secondary" @click="store.goToToday()">Today</SButton>
          <SIconButton size="sm" label="Previous" @click="store.navigate('prev')">
            <ChevronLeft class="h-4 w-4" />
          </SIconButton>
          <SIconButton size="sm" label="Next" @click="store.navigate('next')">
            <ChevronRight class="h-4 w-4" />
          </SIconButton>
          <span class="text-sm font-semibold text-ink-strong flex-1">{{ viewLabel }}</span>
        </div>

        <!-- Active view -->
        <div class="flex-1 min-h-0 overflow-hidden">
          <!-- Week / Day view -->
          <SCalendarWeekView
            v-if="store.view === 'week' || store.view === 'day'"
            :days="viewDays"
            :events="store.events"
            @event-click="openEdit"
            @event-update="handleEventUpdate"
            @slot-click="handleSlotClick"
          />

          <!-- Month view -->
          <SCalendarMonthView
            v-else-if="store.view === 'month'"
            :current-date="store.currentDate"
            :events="store.events"
            @event-click="openEdit"
            @day-click="handleDayClick"
            @event-update="handleEventUpdate"
          />

          <!-- Agenda view -->
          <SCalendarAgendaView
            v-else-if="store.view === 'agenda'"
            :from-date="store.currentDate"
            :events="store.events"
            @event-click="openEdit"
          />
        </div>
      </div>
    </div>

    <!-- ── Event modal ──────────────────────────────────────────────────── -->
    <SCalendarEventModal
      :open="modalOpen"
      :event="editingEvent"
      :default-start="defaultStart"
      :default-end="defaultEnd"
      @close="closeModal"
      @save="handleSave"
      @delete="handleDelete"
    />
  </div>
</template>
