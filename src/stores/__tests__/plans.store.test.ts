import { describe, expect, it, vi, beforeEach } from 'vitest'
import { usePlansStore } from '../plans.store'
import type { ReadingPlan } from '@/types/plans.types'

vi.mock('@/services/plans.service', () => ({
  plansService: {
    getMyPlans: vi.fn(),
    getPlan: vi.fn(),
    create: vi.fn(),
    addDay: vi.fn(),
    publish: vi.fn(),
    archive: vi.fn(),
    join: vi.fn(),
    recordProgress: vi.fn(),
    delete: vi.fn(),
  },
}))

const { plansService } = await import('@/services/plans.service')

const makePlan = (overrides: Partial<ReadingPlan> = {}): ReadingPlan => ({
  id: 'plan-1',
  title: 'Gospel of John',
  description: null,
  status: 'Draft',
  isPublic: false,
  createdBy: 'user-1',
  createdAt: '2025-05-01T10:00:00Z',
  days: [],
  participants: [],
  ...overrides,
})

describe('plans store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchMyPlans', () => {
    it('loads plans on first call', async () => {
      const mockPlans = [makePlan()]
      vi.mocked(plansService.getMyPlans).mockResolvedValue(mockPlans)

      const store = usePlansStore()
      await store.fetchMyPlans()

      expect(plansService.getMyPlans).toHaveBeenCalledOnce()
      expect(store.plans).toEqual(mockPlans)
    })

    it('skips fetch when cache is fresh', async () => {
      vi.mocked(plansService.getMyPlans).mockResolvedValue([makePlan()])

      const store = usePlansStore()
      await store.fetchMyPlans()
      await store.fetchMyPlans()

      expect(plansService.getMyPlans).toHaveBeenCalledOnce()
    })

    it('re-fetches when force=true', async () => {
      vi.mocked(plansService.getMyPlans).mockResolvedValue([makePlan()])

      const store = usePlansStore()
      await store.fetchMyPlans()
      await store.fetchMyPlans(true)

      expect(plansService.getMyPlans).toHaveBeenCalledTimes(2)
    })

    it('re-fetches after invalidateCache()', async () => {
      vi.mocked(plansService.getMyPlans).mockResolvedValue([makePlan()])

      const store = usePlansStore()
      await store.fetchMyPlans()
      store.invalidateCache()
      await store.fetchMyPlans()

      expect(plansService.getMyPlans).toHaveBeenCalledTimes(2)
    })
  })

  describe('computed filters', () => {
    it('activePlans returns only Active plans', async () => {
      vi.mocked(plansService.getMyPlans).mockResolvedValue([
        makePlan({ id: 'a', status: 'Active' }),
        makePlan({ id: 'b', status: 'Draft' }),
        makePlan({ id: 'c', status: 'Active' }),
      ])

      const store = usePlansStore()
      await store.fetchMyPlans()

      expect(store.activePlans).toHaveLength(2)
      expect(store.activePlans.every((p) => p.status === 'Active')).toBe(true)
    })

    it('draftPlans returns only Draft plans', async () => {
      vi.mocked(plansService.getMyPlans).mockResolvedValue([
        makePlan({ id: 'a', status: 'Draft' }),
        makePlan({ id: 'b', status: 'Active' }),
      ])

      const store = usePlansStore()
      await store.fetchMyPlans()

      expect(store.draftPlans).toHaveLength(1)
      expect(store.draftPlans[0].id).toBe('a')
    })
  })

  describe('create', () => {
    it('prepends new plan and updates cache timestamp', async () => {
      const existing = makePlan({ id: 'old' })
      const created = makePlan({ id: 'new', title: 'Psalms' })

      vi.mocked(plansService.getMyPlans).mockResolvedValue([existing])
      vi.mocked(plansService.create).mockResolvedValue(created)

      const store = usePlansStore()
      await store.fetchMyPlans()
      await store.create({ title: 'Psalms', description: null, isPublic: false })

      expect(store.plans[0].id).toBe('new')

      // Cache should still be considered fresh after create
      vi.mocked(plansService.getMyPlans).mockResolvedValue([])
      await store.fetchMyPlans()
      expect(plansService.getMyPlans).toHaveBeenCalledOnce() // not called again
    })

    it('makes the created plan immediately available as the active detail plan', async () => {
      const created = makePlan({ id: 'new', title: 'Psalms' })
      vi.mocked(plansService.create).mockResolvedValue(created)

      const store = usePlansStore()
      await store.create({ title: 'Psalms', description: null, isPublic: false })

      expect(store.activePlan).toEqual(created)
      expect(store.plans[0]).toEqual(created)
    })
  })

  describe('fetchPlan', () => {
    it('keeps a cached list plan visible when the detail refresh fails', async () => {
      const cached = makePlan({ id: 'plan-1', title: 'Cached plan' })

      vi.mocked(plansService.getMyPlans).mockResolvedValue([cached])
      vi.mocked(plansService.getPlan).mockRejectedValue(new Error('network unavailable'))

      const store = usePlansStore()
      await store.fetchMyPlans()
      await store.fetchPlan('plan-1')

      expect(store.activePlan).toEqual(cached)
      expect(store.error).toBe('Could not refresh this plan. Showing the last loaded version.')
    })

    it('upserts a refreshed detail plan back into the list', async () => {
      const cached = makePlan({ id: 'plan-1', title: 'Cached plan' })
      const refreshed = makePlan({ id: 'plan-1', title: 'Refreshed plan' })

      vi.mocked(plansService.getMyPlans).mockResolvedValue([cached])
      vi.mocked(plansService.getPlan).mockResolvedValue(refreshed)

      const store = usePlansStore()
      await store.fetchMyPlans()
      await store.fetchPlan('plan-1')

      expect(store.activePlan).toEqual(refreshed)
      expect(store.plans[0].title).toBe('Refreshed plan')
      expect(store.error).toBeNull()
    })
  })

  describe('publish', () => {
    it('updates the plan status in the list', async () => {
      const draft = makePlan({ status: 'Draft' })
      const published = makePlan({ status: 'Active' })

      vi.mocked(plansService.getMyPlans).mockResolvedValue([draft])
      vi.mocked(plansService.publish).mockResolvedValue(published)

      const store = usePlansStore()
      await store.fetchMyPlans()
      await store.publish('plan-1')

      expect(store.plans[0].status).toBe('Active')
    })
  })

  describe('remove', () => {
    it('removes plan from list', async () => {
      vi.mocked(plansService.getMyPlans).mockResolvedValue([makePlan()])
      vi.mocked(plansService.delete).mockResolvedValue(undefined)

      const store = usePlansStore()
      await store.fetchMyPlans()
      await store.remove('plan-1')

      expect(store.plans).toHaveLength(0)
    })
  })
})
