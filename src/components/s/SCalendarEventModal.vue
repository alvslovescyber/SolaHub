<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { format, parseISO } from 'date-fns'
  import { Trash2 } from 'lucide-vue-next'
  import SModal from './SModal.vue'
  import SButton from './SButton.vue'
  import SIconButton from './SIconButton.vue'
  import SInput from './SInput.vue'
  import SSelect from './SSelect.vue'
  import SLabel from './SLabel.vue'
  import SCheckbox from './SCheckbox.vue'
  import type { CalendarEvent, EventCategory } from '@/stores/calendar.store'
  import { CATEGORY_CONFIG } from '@/stores/calendar.store'

  interface Props {
    open: boolean
    event?: CalendarEvent | null
    defaultStart?: Date
    defaultEnd?: Date
  }

  const props = withDefaults(defineProps<Props>(), {
    event: null,
    defaultStart: undefined,
    defaultEnd: undefined,
  })

  const emit = defineEmits<{
    close: []
    save: [data: Omit<CalendarEvent, 'id'>]
    delete: [id: string]
  }>()

  const categoryOptions = (Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((key) => ({
    value: key,
    label: CATEGORY_CONFIG[key].label,
  }))

  function toLocalDatetime(iso: string): string {
    return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm")
  }

  function toLocalDate(d: Date): string {
    return format(d, "yyyy-MM-dd'T'HH:mm")
  }

  const title = ref('')
  const category = ref<EventCategory>('service')
  const startDt = ref('')
  const endDt = ref('')
  const allDay = ref(false)
  const location = ref('')
  const speaker = ref('')
  const description = ref('')

  watch(
    () => props.open,
    (open) => {
      if (!open) return
      if (props.event) {
        title.value = props.event.title
        category.value = props.event.category
        startDt.value = toLocalDatetime(props.event.start)
        endDt.value = toLocalDatetime(props.event.end)
        allDay.value = props.event.allDay
        location.value = props.event.location ?? ''
        speaker.value = props.event.speaker ?? ''
        description.value = props.event.description ?? ''
      } else {
        title.value = ''
        category.value = 'service'
        const s = props.defaultStart ?? new Date()
        const e = props.defaultEnd ?? new Date(s.getTime() + 60 * 60 * 1000)
        startDt.value = toLocalDate(s)
        endDt.value = toLocalDate(e)
        allDay.value = false
        location.value = ''
        speaker.value = ''
        description.value = ''
      }
    },
    { immediate: true }
  )

  const showSpeakerField = computed(
    () => category.value === 'service' || category.value === 'speaker'
  )

  const isValid = computed(() => title.value.trim().length > 0 && startDt.value && endDt.value)

  function save() {
    if (!isValid.value) return
    const startDate = new Date(startDt.value)
    const endDate = new Date(endDt.value)
    if (endDate <= startDate) {
      endDate.setTime(startDate.getTime() + 60 * 60 * 1000)
    }
    emit('save', {
      title: title.value.trim(),
      category: category.value,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      allDay: allDay.value,
      location: location.value.trim() || undefined,
      speaker: speaker.value.trim() || undefined,
      description: description.value.trim() || undefined,
    })
  }
</script>

<template>
  <SModal :open="open" :title="event ? 'Edit event' : 'New event'" size="md" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <SInput v-model="title" label="Title" placeholder="Event title" required autofocus />

      <SSelect v-model="category as string" label="Category" :options="categoryOptions" />

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <SLabel>Start</SLabel>
          <input
            v-model="startDt"
            type="datetime-local"
            :disabled="allDay"
            class="h-9 rounded-md border border-line bg-surface-base px-3 text-sm text-ink-strong focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:opacity-50"
          />
        </div>
        <div class="flex flex-col gap-1">
          <SLabel>End</SLabel>
          <input
            v-model="endDt"
            type="datetime-local"
            :disabled="allDay"
            class="h-9 rounded-md border border-line bg-surface-base px-3 text-sm text-ink-strong focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:opacity-50"
          />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <SCheckbox :checked="allDay" @update:checked="allDay = $event" />
        <span class="text-sm text-ink-base">All day</span>
      </div>

      <SInput v-model="location" label="Location" placeholder="Room or address" />

      <SInput
        v-if="showSpeakerField"
        v-model="speaker"
        label="Speaker / Pastor"
        placeholder="Name of speaker"
      />

      <div class="flex flex-col gap-1">
        <SLabel>Notes</SLabel>
        <textarea
          v-model="description"
          rows="3"
          placeholder="Additional details…"
          class="rounded-md border border-line bg-surface-base px-3 py-2 text-sm text-ink-strong resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex w-full items-center justify-between">
        <SIconButton v-if="event" label="Delete event" size="sm" @click="emit('delete', event!.id)">
          <Trash2 class="h-4 w-4 text-red-500" />
        </SIconButton>
        <div v-else />
        <div class="flex gap-2">
          <SButton variant="secondary" size="sm" @click="emit('close')">Cancel</SButton>
          <SButton variant="primary" size="sm" :disabled="!isValid" @click="save">
            {{ event ? 'Save changes' : 'Create event' }}
          </SButton>
        </div>
      </div>
    </template>
  </SModal>
</template>
