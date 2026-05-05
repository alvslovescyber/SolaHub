import { readJsonStorage, removeStorageItem, writeJsonStorage } from '@/lib/safeStorage'
import type { User, UserRole } from '@/types/user.types'

const OFFLINE_USER_KEY = 'solahub:offline-user'
const OFFLINE_USER_SCHEMA_VERSION = 1
const USER_ROLES: UserRole[] = ['Member', 'Presenter', 'Pastor', 'Admin']

interface OfflineUserEnvelope {
  schemaVersion: typeof OFFLINE_USER_SCHEMA_VERSION
  cachedAt: string
  user: User
}

export function saveOfflineUser(user: User): void {
  writeJsonStorage(OFFLINE_USER_KEY, {
    schemaVersion: OFFLINE_USER_SCHEMA_VERSION,
    cachedAt: new Date().toISOString(),
    user,
  } satisfies OfflineUserEnvelope)
}

export function loadOfflineUser(): User | null {
  return readJsonStorage<User | null>(OFFLINE_USER_KEY, null, normalizeOfflineUserCache)
}

export function clearOfflineUser(): void {
  removeStorageItem(OFFLINE_USER_KEY)
}

function normalizeUser(value: unknown): User | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Partial<Record<keyof User, unknown>>

  if (
    typeof row.id !== 'string' ||
    typeof row.email !== 'string' ||
    typeof row.displayName !== 'string' ||
    typeof row.createdAt !== 'string' ||
    row.isActive === false ||
    !isUserRole(row.role)
  ) {
    return null
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    churchId: typeof row.churchId === 'string' ? row.churchId : null,
    isEmailVerified: row.isEmailVerified === true,
    isActive: true,
    createdAt: row.createdAt,
  }
}

function normalizeOfflineUserCache(value: unknown): User | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Partial<OfflineUserEnvelope>

  if ('user' in row) {
    return row.schemaVersion === OFFLINE_USER_SCHEMA_VERSION && typeof row.cachedAt === 'string'
      ? normalizeUser(row.user)
      : null
  }

  // Accept the first offline-cache shape used before the envelope existed.
  return normalizeUser(value)
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole)
}
