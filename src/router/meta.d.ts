import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    offlineReady?: boolean
    authIsolated?: boolean
  }
}
