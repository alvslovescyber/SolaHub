import { ref, shallowRef, computed } from 'vue'
import { defineStore } from 'pinia'
import { plansService } from '@/services/plans.service'
import type { AddPlanDayPayload, CreatePlanPayload, ReadingPlan } from '@/types/plans.types'

function extractApiError(e: unknown): string | null {
  const err = e as { response?: { data?: unknown } }
  const data = err.response?.data
  if (!data || typeof data !== 'object') return null
  const d = data as { description?: unknown; title?: unknown }
  if (typeof d.description === 'string') return d.description
  if (typeof d.title === 'string') return d.title
  return null
}

const CACHE_TTL = 5 * 60_000 // 5 minutes

export const usePlansStore = defineStore('plans', () => {
  const plans = shallowRef<ReadingPlan[]>([])
  const activePlan = ref<ReadingPlan | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  let lastFetchedAt = 0

  const activePlans = computed(() => plans.value.filter((p) => p.status === 'Active'))
  const draftPlans = computed(() => plans.value.filter((p) => p.status === 'Draft'))

  async function fetchMyPlans(force = false): Promise<void> {
    if (!force && plans.value.length > 0 && Date.now() - lastFetchedAt < CACHE_TTL) return
    isLoading.value = true
    error.value = null
    try {
      plans.value = await plansService.getMyPlans()
      lastFetchedAt = Date.now()
    } catch {
      error.value = 'Failed to load reading plans.'
    } finally {
      isLoading.value = false
    }
  }

  function invalidateCache(): void {
    lastFetchedAt = 0
  }

  async function fetchPlan(id: string): Promise<void> {
    isLoading.value = true
    error.value = null
    activePlan.value = null
    try {
      activePlan.value = await plansService.getPlan(id)
    } catch {
      error.value = 'Failed to load plan.'
    } finally {
      isLoading.value = false
    }
  }

  async function create(payload: CreatePlanPayload): Promise<ReadingPlan> {
    isSaving.value = true
    error.value = null
    try {
      const plan = await plansService.create(payload)
      plans.value = [plan, ...plans.value]
      lastFetchedAt = Date.now()
      return plan
    } catch (e) {
      error.value = extractApiError(e) ?? 'Failed to create reading plan.'
      throw e
    } finally {
      isSaving.value = false
    }
  }

  async function join(id: string): Promise<void> {
    await plansService.join(id)
    invalidateCache()
    await fetchMyPlans(true)
  }

  async function recordProgress(planId: string, dayNumber: number): Promise<void> {
    await plansService.recordProgress(planId, dayNumber)
    // Refresh the active plan so participant progress is up to date
    if (activePlan.value?.id === planId) {
      await fetchPlan(planId)
    }
  }

  async function addDay(planId: string, payload: AddPlanDayPayload): Promise<void> {
    isSaving.value = true
    error.value = null
    try {
      const updated = await plansService.addDay(planId, payload)
      activePlan.value = updated
      plans.value = plans.value.map((p) => (p.id === planId ? updated : p))
    } catch (e) {
      error.value = extractApiError(e) ?? 'Failed to add day.'
      throw e
    } finally {
      isSaving.value = false
    }
  }

  async function publish(planId: string): Promise<void> {
    isSaving.value = true
    error.value = null
    try {
      const updated = await plansService.publish(planId)
      activePlan.value = updated
      plans.value = plans.value.map((p) => (p.id === planId ? updated : p))
    } catch (e) {
      error.value = extractApiError(e) ?? 'Failed to publish plan.'
      throw e
    } finally {
      isSaving.value = false
    }
  }

  async function archive(planId: string): Promise<void> {
    isSaving.value = true
    error.value = null
    try {
      const updated = await plansService.archive(planId)
      activePlan.value = updated
      plans.value = plans.value.map((p) => (p.id === planId ? updated : p))
    } catch (e) {
      error.value = extractApiError(e) ?? 'Failed to archive plan.'
      throw e
    } finally {
      isSaving.value = false
    }
  }

  async function remove(id: string): Promise<void> {
    await plansService.delete(id)
    plans.value = plans.value.filter((p) => p.id !== id)
    if (activePlan.value?.id === id) activePlan.value = null
    invalidateCache()
  }

  function reset(): void {
    plans.value = []
    activePlan.value = null
    error.value = null
    lastFetchedAt = 0
  }

  return {
    plans,
    activePlan,
    isLoading,
    isSaving,
    error,
    activePlans,
    draftPlans,
    fetchMyPlans,
    fetchPlan,
    create,
    join,
    addDay,
    publish,
    archive,
    recordProgress,
    remove,
    invalidateCache,
    reset,
  }
})
