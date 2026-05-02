import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { useActivityFeed } from '../useActivityFeed'

// ── Store mocks — must be reactive so computed refs re-evaluate on mutation ──
const mockAuth = reactive<{ user: { id: string; displayName: string; createdAt: string } | null }>({
  user: null,
})
const mockNotes = reactive<{ notes: unknown[]; isLoading: boolean }>({
  notes: [],
  isLoading: false,
})
const mockPlans = reactive<{ plans: unknown[]; isLoading: boolean }>({
  plans: [],
  isLoading: false,
})

vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => mockAuth }))
vi.mock('@/stores/notes.store', () => ({ useNotesStore: () => mockNotes }))
vi.mock('@/stores/plans.store', () => ({ usePlansStore: () => mockPlans }))

// ── Helpers ──────────────────────────────────────────────────────────────────
const isoDate = (offsetMs = 0) => new Date(Date.now() - offsetMs).toISOString()

function makeNote(overrides = {}) {
  return {
    id: 'n1',
    userId: 'u1',
    verseRef: 'John 3:16',
    content: 'God so loved',
    tags: [],
    isShared: false,
    createdAt: isoDate(3_600_000),
    updatedAt: isoDate(3_600_000),
    ...overrides,
  }
}

function makePlan(overrides = {}) {
  return {
    id: 'p1',
    title: 'Gospel of John',
    description: null,
    status: 'Active',
    isPublic: false,
    createdBy: 'u1',
    createdAt: isoDate(86_400_000),
    days: [],
    participants: [],
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('useActivityFeed', () => {
  describe('feed', () => {
    it('returns empty when stores have no data and no user', () => {
      mockAuth.user = null
      mockNotes.notes = []
      mockPlans.plans = []

      const { feed } = useActivityFeed()
      expect(feed.value).toHaveLength(0)
    })

    it('includes account_created event when user exists', () => {
      mockAuth.user = { id: 'u1', displayName: 'Alvis', createdAt: isoDate(7 * 86_400_000) }
      mockNotes.notes = []
      mockPlans.plans = []

      const { feed } = useActivityFeed()
      expect(feed.value.some((e) => e.type === 'account_created')).toBe(true)
    })

    it('creates a note_created event for each note', () => {
      mockAuth.user = { id: 'u1', displayName: 'Alvis', createdAt: isoDate(10 * 86_400_000) }
      mockNotes.notes = [
        makeNote({ id: 'n1', verseRef: 'John 3:16' }),
        makeNote({ id: 'n2', verseRef: 'Psalm 23:1' }),
      ]
      mockPlans.plans = []

      const { feed } = useActivityFeed()
      const createdEvents = feed.value.filter((e) => e.type === 'note_created')
      expect(createdEvents).toHaveLength(2)
    })

    it('creates a note_updated event only when updatedAt is >1 min after createdAt', () => {
      mockAuth.user = { id: 'u1', displayName: 'Alvis', createdAt: isoDate(10 * 86_400_000) }
      const old = isoDate(3_600_000)
      mockNotes.notes = [
        // Updated > 1 min later → should produce an update event
        makeNote({ id: 'n1', createdAt: old, updatedAt: isoDate(1_800_000) }),
        // Updated < 1 min later → should NOT produce an update event
        makeNote({
          id: 'n2',
          createdAt: old,
          updatedAt: new Date(new Date(old).getTime() + 30_000).toISOString(),
        }),
      ]
      mockPlans.plans = []

      const { feed } = useActivityFeed()
      const updatedEvents = feed.value.filter((e) => e.type === 'note_updated')
      expect(updatedEvents).toHaveLength(1)
      expect(updatedEvents[0].id).toBe('note-updated-n1')
    })

    it('creates plan_created when user owns the plan', () => {
      mockAuth.user = { id: 'u1', displayName: 'Alvis', createdAt: isoDate(30 * 86_400_000) }
      mockNotes.notes = []
      mockPlans.plans = [makePlan({ createdBy: 'u1' })]

      const { feed } = useActivityFeed()
      expect(feed.value.some((e) => e.type === 'plan_created')).toBe(true)
    })

    it('creates plan_joined when user is a participant but not creator', () => {
      mockAuth.user = { id: 'u1', displayName: 'Alvis', createdAt: isoDate(30 * 86_400_000) }
      mockNotes.notes = []
      mockPlans.plans = [
        makePlan({
          createdBy: 'u2',
          participants: [{ userId: 'u1', currentDay: 3, joinedAt: isoDate(2 * 86_400_000) }],
        }),
      ]

      const { feed } = useActivityFeed()
      expect(feed.value.some((e) => e.type === 'plan_joined')).toBe(true)
      expect(feed.value.some((e) => e.type === 'plan_created')).toBe(false)
    })

    it('does not create plan_joined if user is not a participant', () => {
      mockAuth.user = { id: 'u1', displayName: 'Alvis', createdAt: isoDate(30 * 86_400_000) }
      mockNotes.notes = []
      mockPlans.plans = [makePlan({ createdBy: 'u2', participants: [] })]

      const { feed } = useActivityFeed()
      expect(feed.value.some((e) => e.type === 'plan_joined')).toBe(false)
    })

    it('returns events sorted newest first', () => {
      mockAuth.user = { id: 'u1', displayName: 'Alvis', createdAt: isoDate(30 * 86_400_000) }
      mockNotes.notes = [
        makeNote({ id: 'n1', createdAt: isoDate(86_400_000), updatedAt: isoDate(86_400_000) }),
        makeNote({ id: 'n2', createdAt: isoDate(3_600_000), updatedAt: isoDate(3_600_000) }),
      ]
      mockPlans.plans = []

      const { feed } = useActivityFeed()
      const noteEvents = feed.value.filter((e) => e.type === 'note_created')
      expect(noteEvents[0].id).toBe('note-created-n2') // newer first
      expect(noteEvents[1].id).toBe('note-created-n1')
    })
  })

  describe('grouped', () => {
    it('groups feed events by date label', () => {
      mockAuth.user = { id: 'u1', displayName: 'Alvis', createdAt: isoDate(30 * 86_400_000) }
      mockNotes.notes = [
        makeNote({ id: 'n1', createdAt: isoDate(30_000), updatedAt: isoDate(30_000) }), // today
        makeNote({
          id: 'n2',
          createdAt: isoDate(5 * 86_400_000),
          updatedAt: isoDate(5 * 86_400_000),
        }), // this week
      ]
      mockPlans.plans = []

      const { grouped } = useActivityFeed()
      const labels = grouped.value.map((g) => g.label)
      expect(labels).toContain('Today')
      expect(labels).toContain('This week')
    })
  })

  describe('isLoading', () => {
    it('reflects notes or plans loading state', () => {
      mockAuth.user = null
      mockNotes.notes = []
      mockPlans.plans = []
      mockNotes.isLoading = true

      const { isLoading } = useActivityFeed()
      expect(isLoading.value).toBe(true)

      mockNotes.isLoading = false
      expect(isLoading.value).toBe(false)
    })
  })
})
