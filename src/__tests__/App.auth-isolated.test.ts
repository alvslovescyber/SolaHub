import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const appMocks = vi.hoisted(() => ({
  route: {
    matched: [] as Array<{ meta: { authIsolated?: boolean } }>,
  },
  initTheme: vi.fn(),
  rehydrate: vi.fn(),
  handleSessionExpired: vi.fn(),
  acceptRefreshedSession: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('@/stores/ui.store', () => ({
  useUiStore: () => ({
    initTheme: appMocks.initTheme,
  }),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    rehydrate: appMocks.rehydrate,
    handleSessionExpired: appMocks.handleSessionExpired,
    acceptRefreshedSession: appMocks.acceptRefreshedSession,
  }),
}))

vi.mock('vue-router', () => ({
  RouterView: { name: 'RouterView', template: '<div />' },
  useRoute: () => appMocks.route,
  useRouter: () => ({
    replace: appMocks.replace,
  }),
}))

describe('App auth-isolated routes', () => {
  beforeEach(() => {
    appMocks.route.matched = []
    appMocks.initTheme.mockClear()
    appMocks.rehydrate.mockClear()
    appMocks.handleSessionExpired.mockClear()
    appMocks.acceptRefreshedSession.mockClear()
    appMocks.replace.mockClear()
  })

  it('does not rehydrate or handle expired-session events on presenter display', async () => {
    appMocks.route.matched = [{ meta: { authIsolated: true } }]

    const wrapper = await mountApp()
    await nextTick()

    expect(appMocks.initTheme).toHaveBeenCalledOnce()
    expect(appMocks.rehydrate).not.toHaveBeenCalled()

    window.dispatchEvent(new CustomEvent('auth:session-expired'))
    expect(appMocks.handleSessionExpired).not.toHaveBeenCalled()

    window.dispatchEvent(
      new CustomEvent('auth:session-refreshed', { detail: { user: { id: 'admin-1' } } })
    )
    expect(appMocks.acceptRefreshedSession).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('keeps normal app routes wired into session handling', async () => {
    appMocks.route.matched = [{ meta: {} }]

    const wrapper = await mountApp()
    await nextTick()

    expect(appMocks.initTheme).toHaveBeenCalledOnce()
    expect(appMocks.rehydrate).toHaveBeenCalledOnce()

    window.dispatchEvent(new CustomEvent('auth:session-expired'))
    expect(appMocks.handleSessionExpired).toHaveBeenCalledOnce()

    window.dispatchEvent(
      new CustomEvent('auth:session-refreshed', { detail: { user: { id: 'admin-1' } } })
    )
    expect(appMocks.acceptRefreshedSession).toHaveBeenCalledWith({ id: 'admin-1' })

    appMocks.handleSessionExpired.mockClear()
    appMocks.acceptRefreshedSession.mockClear()
    wrapper.unmount()
    window.dispatchEvent(new CustomEvent('auth:session-expired'))
    expect(appMocks.handleSessionExpired).not.toHaveBeenCalled()
    window.dispatchEvent(
      new CustomEvent('auth:session-refreshed', { detail: { user: { id: 'admin-2' } } })
    )
    expect(appMocks.acceptRefreshedSession).not.toHaveBeenCalled()
  })
})

async function mountApp() {
  const App = (await import('@/App.vue')).default
  return mount(App)
}
