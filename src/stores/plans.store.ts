import { ref, shallowRef, computed } from 'vue'
import { defineStore } from 'pinia'
import { plansService } from '@/services/plans.service'
import type { CreatePlanPayload, ReadingPlan } from '@/types/plans.types'

export const usePlansStore = defineStore('plans', () => {
  const plans = shallowRef<ReadingPlan[]>([])
  const activePlan = ref<ReadingPlan | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  const activePlans = computed(() => plans.value.filter((p) => p.status === 'Active'))
  const draftPlans = computed(() => plans.value.filter((p) => p.status === 'Draft'))

  async function fetchMyPlans(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      plans.value = await plansService.getMyPlans()
    } catch {
      error.value = 'Failed to load reading plans.'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPlan(id: string): Promise<void> {
    isLoading.value = true
    error.value = null
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
      return plan
    } catch (e) {
      error.value = 'Failed to create plan.'
      throw e
    } finally {
      isSaving.value = false
    }
  }

  async function join(id: string): Promise<void> {
    await plansService.join(id)
    await fetchMyPlans()
  }

  async function recordProgress(planId: string, dayNumber: number): Promise<void> {
    await plansService.recordProgress(planId, dayNumber)
    // Refresh the active plan so participant progress is up to date
    if (activePlan.value?.id === planId) {
      await fetchPlan(planId)
    }
  }

  async function remove(id: string): Promise<void> {
    await plansService.delete(id)
    plans.value = plans.value.filter((p) => p.id !== id)
    if (activePlan.value?.id === id) activePlan.value = null
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
    recordProgress,
    remove,
  }
})
