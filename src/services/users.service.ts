import { http } from './http/client'
import type { User } from '@/types/user.types'

export const usersService = {
  async getMe(): Promise<User> {
    const res = await http.get<User>('/api/users/me')
    return res.data
  },

  async updateProfile(displayName: string): Promise<User> {
    const res = await http.put<User>('/api/users/me', { displayName })
    return res.data
  },
}
