import { http } from './http/client'
import type { CreatePlanPayload, ReadingPlan } from '@/types/plans.types'

export const plansService = {
  async getMyPlans(): Promise<ReadingPlan[]> {
    const res = await http.get<ReadingPlan[]>('/api/plans')
    return res.data
  },

  async getPlan(id: string): Promise<ReadingPlan> {
    const res = await http.get<ReadingPlan>(`/api/plans/${id}`)
    return res.data
  },

  async create(payload: CreatePlanPayload): Promise<ReadingPlan> {
    const res = await http.post<ReadingPlan>('/api/plans', payload)
    return res.data
  },

  async join(id: string): Promise<void> {
    await http.post(`/api/plans/${id}/join`)
  },

  async recordProgress(id: string, dayNumber: number): Promise<void> {
    await http.post(`/api/plans/${id}/progress`, { dayNumber })
  },

  async delete(id: string): Promise<void> {
    await http.delete(`/api/plans/${id}`)
  },
}
