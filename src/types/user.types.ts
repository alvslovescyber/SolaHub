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
  expiresAt: string
}

export interface AuthResponse extends AuthTokens {
  refreshToken: string
  user: User
}
