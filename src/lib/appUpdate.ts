import { getStorageItem, removeStorageItem, setStorageItem } from '@/lib/safeStorage'

const UPDATE_RETURN_ROUTE_KEY = 'solahub:update-return-route'

export function rememberUpdateReturnRoute(route: string): void {
  if (isSafeAppRoute(route)) {
    setStorageItem(UPDATE_RETURN_ROUTE_KEY, route)
  }
}

export function clearUpdateReturnRoute(): void {
  removeStorageItem(UPDATE_RETURN_ROUTE_KEY)
}

export function consumeUpdateReturnRoute(): string | null {
  const route = getStorageItem(UPDATE_RETURN_ROUTE_KEY)
  removeStorageItem(UPDATE_RETURN_ROUTE_KEY)
  return route && isSafeAppRoute(route) ? route : null
}

function isSafeAppRoute(route: string): boolean {
  return route.startsWith('/') && !route.startsWith('//') && !route.startsWith('/presenter-display')
}
