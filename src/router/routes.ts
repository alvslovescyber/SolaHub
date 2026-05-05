import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  // ─── Auth (public) ──────────────────────────────────────────────────────────
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { requiresGuest: true },
  },

  // ─── App (authenticated) ────────────────────────────────────────────────────
  {
    path: '/',
    component: () => import('@/components/s/SAppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      // STUDY
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: () => import('@/views/CalendarView.vue'),
      },
      {
        path: 'inbox',
        name: 'inbox',
        component: () => import('@/views/InboxView.vue'),
      },

      // SCRIPTURE
      {
        path: 'bible',
        name: 'bible',
        component: () => import('@/views/BibleView.vue'),
        meta: { offlineReady: true },
      },
      {
        path: 'plans',
        name: 'plans',
        component: () => import('@/views/PlansView.vue'),
      },
      {
        path: 'plans/:id',
        name: 'plan-detail',
        component: () => import('@/views/PlanDetailView.vue'),
        props: true,
      },
      {
        path: 'notes',
        name: 'notes',
        component: () => import('@/views/NotesView.vue'),
        meta: { offlineReady: true },
      },

      // SUNDAY
      {
        path: 'presenter',
        name: 'presenter',
        component: () => import('@/views/PresenterView.vue'),
        meta: { offlineReady: true },
      },
      {
        path: 'community',
        name: 'community',
        component: () => import('@/views/CommunityView.vue'),
      },

      // BOTTOM
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
      },
    ],
  },

  // ─── Presenter display window (fullscreen, no layout chrome) ────────────────
  {
    path: '/presenter-display',
    name: 'presenter-display',
    component: () => import('@/views/PresenterDisplayView.vue'),
    meta: { authIsolated: true, offlineReady: true },
  },

  // ─── 404 ────────────────────────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]
