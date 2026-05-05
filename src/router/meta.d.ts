import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
    requiresGuest?: boolean
    offlineReady?: boolean
    authIsolated?: boolean
  }
}
