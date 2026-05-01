import { http, tokenStorage } from './http/client'
import type { AuthResponse } from '@/types/user.types'

export const authService = {
  async register(email: string, password: string, displayName: string): Promise<AuthResponse> {
    const res = await http.post<AuthResponse>('/api/auth/register', {
      email,
      password,
      displayName,
    })
    tokenStorage.set(res.data.accessToken, res.data.refreshToken)
    return res.data
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await http.post<AuthResponse>('/api/auth/login', { email, password })
    tokenStorage.set(res.data.accessToken, res.data.refreshToken)
    return res.data
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefresh()
    if (refreshToken) {
      await http.post('/api/auth/logout', { refreshToken }).catch(() => {
        // Best-effort: clear local tokens even if server call fails
      })
    }
    tokenStorage.clear()
  },

  async refresh(): Promise<AuthResponse> {
    const refreshToken = tokenStorage.getRefresh()
    if (!refreshToken) throw new Error('No refresh token available')
    const res = await http.post<AuthResponse>('/api/auth/refresh', { refreshToken })
    tokenStorage.set(res.data.accessToken, res.data.refreshToken)
    return res.data
  },
}
