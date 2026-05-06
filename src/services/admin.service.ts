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
  sessionVersion: number
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

export interface UpdateUserRequest {
  role?: string
  isActive?: boolean
}

export const adminService = {
  async getUsers(
    page = 1,
    pageSize = 20,
    search?: string,
    role?: string
  ): Promise<AdminUsersResponse> {
    const params: Record<string, unknown> = { page, pageSize }
    if (search?.trim()) params.search = search.trim()
    if (role) params.role = role
    const res = await http.get<AdminUsersResponse>('/api/admin/users', { params })
    return res.data
  },

  async getStats(): Promise<AdminStats> {
    const res = await http.get<AdminStats>('/api/admin/stats')
    return res.data
  },

  async updateUser(id: string, patch: UpdateUserRequest): Promise<AdminUser> {
    const res = await http.patch<AdminUser>(`/api/admin/users/${id}`, patch)
    return res.data
  },

  async deleteUser(id: string): Promise<void> {
    await http.delete(`/api/admin/users/${id}`)
  },

  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    const res = await http.post<{ temporaryPassword: string }>(
      `/api/admin/users/${id}/reset-password`
    )
    return res.data
  },

  async revokeSessions(id: string): Promise<void> {
    await http.post(`/api/admin/users/${id}/revoke-sessions`)
  },
}
