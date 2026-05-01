export type PlanStatus = 'Draft' | 'Active' | 'Completed' | 'Archived'

export interface PlanDay {
  dayNumber: number
  title: string
  verseRefs: string[]
}

export interface PlanParticipant {
  userId: string
  currentDay: number
  joinedAt: string
}

export interface ReadingPlan {
  id: string
  title: string
  description: string | null
  status: PlanStatus
  isPublic: boolean
  createdBy: string
  createdAt: string
  days: PlanDay[]
  participants: PlanParticipant[]
}

export interface CreatePlanPayload {
  title: string
  description: string | null
  isPublic: boolean
}
