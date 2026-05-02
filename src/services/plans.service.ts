import { http } from './http/client'
import type { AddPlanDayPayload, CreatePlanPayload, ReadingPlan } from '@/types/plans.types'

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

  async addDay(id: string, payload: AddPlanDayPayload): Promise<ReadingPlan> {
    const res = await http.post<ReadingPlan>(`/api/plans/${id}/days`, payload)
    return res.data
  },

  async publish(id: string): Promise<ReadingPlan> {
    const res = await http.post<ReadingPlan>(`/api/plans/${id}/publish`)
    return res.data
  },

  async archive(id: string): Promise<ReadingPlan> {
    const res = await http.post<ReadingPlan>(`/api/plans/${id}/archive`)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await http.delete(`/api/plans/${id}`)
  },
}
