import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    requiresPresenter?: boolean
    offlineReady?: boolean
  }
}
