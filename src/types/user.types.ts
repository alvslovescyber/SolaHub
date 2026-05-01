export type UserRole = 'Member' | 'Presenter' | 'Pastor' | 'Admin'

export interface User {
  id: string
  email: string
  displayName: string
  role: UserRole
  churchId: string | null
  isEmailVerified: boolean
  isActive: boolean
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export interface AuthResponse extends AuthTokens {
  user: User
}
