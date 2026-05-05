import { http } from './http/client'

export interface AdminUser {
  id: string
  displayName: string
  email: string
  role: string
  isActive: boolean
  isEmailVerified: boolean
  churchId: string | null
  createdAt: string
  lastLoginAt: string | null
}

export interface AdminUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  pageSize: number
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  totalNotes: number
  totalPlans: number
  totalChurches: number
  totalCommunityPosts: number
}

export const adminService = {
  async getUsers(page = 1, pageSize = 20): Promise<AdminUsersResponse> {
    const res = await http.get<AdminUsersResponse>('/api/admin/users', {
      params: { page, pageSize },
    })
    return res.data
  },

  async getStats(): Promise<AdminStats> {
    const res = await http.get<AdminStats>('/api/admin/stats')
    return res.data
  },
}
