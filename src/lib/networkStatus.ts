export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as {
    code?: unknown
    request?: unknown
    response?: unknown
    message?: unknown
  }

  if (err.response) return false
  if (isBrowserOffline()) return true
  if (err.request) return true
  return err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED'
}
