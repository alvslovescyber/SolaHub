import { computed, markRaw } from 'vue'
import { CalendarDays, StickyNote, UserCheck } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useNotesStore } from '@/stores/notes.store'
import { usePlansStore } from '@/stores/plans.store'
import type { ActivityEvent, ActivityGroup } from '@/types/activity.types'
import { groupByDate } from '@/utils/formatTime'

// One minute in ms — threshold below which updatedAt is treated as the same event as createdAt
const EDIT_THRESHOLD_MS = 60_000

export function useActivityFeed() {
  const auth = useAuthStore()
  const notes = useNotesStore()
  const plans = usePlansStore()

  const feed = computed((): ActivityEvent[] => {
    const events: ActivityEvent[] = []
    const userId = auth.user?.id?.toLowerCase()

    // ── Note events ──────────────────────────────────────────────────────────
    for (const note of notes.notes) {
      const createdMs = new Date(note.createdAt).getTime()
      const updatedMs = new Date(note.updatedAt).getTime()

      events.push({
        id: `note-created-${note.id}`,
        type: 'note_created',
        timestamp: new Date(note.createdAt),
        label: 'Added a verse note',
        detail: note.verseRef + (note.content ? ' — ' + note.content.slice(0, 80) + (note.content.length > 80 ? '…' : '') : ''),
        route: { name: 'notes' },
        icon: markRaw(StickyNote),
        iconBg: 'bg-amber-50 dark:bg-amber-500/15',
        iconColor: 'text-amber-600 dark:text-amber-300',
      })

      if (updatedMs - createdMs > EDIT_THRESHOLD_MS) {
        events.push({
          id: `note-updated-${note.id}`,
          type: 'note_updated',
          timestamp: new Date(note.updatedAt),
          label: 'Updated a verse note',
          detail: note.verseRef + (note.content ? ' — ' + note.content.slice(0, 80) + (note.content.length > 80 ? '…' : '') : ''),
          route: { name: 'notes' },
          icon: markRaw(StickyNote),
          iconBg: 'bg-amber-50 dark:bg-amber-500/15',
          iconColor: 'text-amber-600 dark:text-amber-300',
        })
      }
    }

    // ── Plan events ──────────────────────────────────────────────────────────
    for (const plan of plans.plans) {
      if (plan.createdBy.toLowerCase() === userId) {
        events.push({
          id: `plan-created-${plan.id}`,
          type: 'plan_created',
          timestamp: new Date(plan.createdAt),
          label: 'Created a reading plan',
          detail: plan.title,
          route: { name: 'plan-detail', params: { id: plan.id } },
          icon: markRaw(CalendarDays),
          iconBg: 'bg-violet-50 dark:bg-violet-500/15',
          iconColor: 'text-violet-600 dark:text-violet-300',
        })
      } else {
        const participant = plan.participants.find((p) => p.userId.toLowerCase() === userId)
        if (participant) {
          events.push({
            id: `plan-joined-${plan.id}`,
            type: 'plan_joined',
            timestamp: new Date(participant.joinedAt),
            label: 'Joined a reading plan',
            detail: plan.title,
            route: { name: 'plan-detail', params: { id: plan.id } },
            icon: markRaw(CalendarDays),
            iconBg: 'bg-brand-50 dark:bg-brand-500/15',
            iconColor: 'text-brand-600 dark:text-brand-300',
          })
        }
      }
    }

    // ── Account creation (anchor event) ─────────────────────────────────────
    if (auth.user?.createdAt) {
      events.push({
        id: 'account-created',
        type: 'account_created',
        timestamp: new Date(auth.user.createdAt),
        label: 'Joined SolaHub',
        detail: auth.user.displayName,
        route: { name: 'settings' },
        icon: markRaw(UserCheck),
        iconBg: 'bg-green-50 dark:bg-green-500/15',
        iconColor: 'text-green-600 dark:text-green-300',
      })
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  })

  const grouped = computed((): ActivityGroup[] =>
    groupByDate(feed.value).map(({ label, items }) => ({ label, events: items }))
  )

  const isLoading = computed(() => notes.isLoading || plans.isLoading)

  return { feed, grouped, isLoading }
}
