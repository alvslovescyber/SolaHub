function getLocalStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage
  } catch {
    return null
  }
}

export function getStorageItem(key: string): string | null {
  const storage = getLocalStorage()
  if (!storage) return null

  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function setStorageItem(key: string, value: string): boolean {
  const storage = getLocalStorage()
  if (!storage) return false

  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeStorageItem(key: string): boolean {
  const storage = getLocalStorage()
  if (!storage) return false

  try {
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function readJsonStorage<T>(
  key: string,
  fallback: T,
  normalize?: (value: unknown) => T | null
): T {
  const raw = getStorageItem(key)
  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw) as unknown
    return normalize ? (normalize(parsed) ?? fallback) : (parsed as T)
  } catch {
    return fallback
  }
}

export function writeJsonStorage(key: string, value: unknown): boolean {
  try {
    return setStorageItem(key, JSON.stringify(value))
  } catch {
    return false
  }
}
