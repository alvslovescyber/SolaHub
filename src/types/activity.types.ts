import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export type ActivityEventType =
  | 'note_created'
  | 'note_updated'
  | 'plan_created'
  | 'plan_joined'
  | 'account_created'

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  timestamp: Date
  label: string
  detail?: string
  route?: RouteLocationRaw
  icon: Component
  iconBg: string
  iconColor: string
}

export interface ActivityGroup {
  label: string
  events: ActivityEvent[]
}
