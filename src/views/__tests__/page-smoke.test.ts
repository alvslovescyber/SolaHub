import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Component } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CANONICAL_BOOKS } from '@/services/bible.service'
import { useAuthStore } from '@/stores/auth.store'
import { useNotationsStore } from '@/stores/notations.store'
import { usePresenterStore } from '@/stores/presenter.store'
import type * as BibleServiceModule from '@/services/bible.service'
import type { NotationSlide } from '@/types/presenter.types'
import type { ReadingPlan } from '@/types/plans.types'
import type { User } from '@/types/user.types'
import BibleView from '../BibleView.vue'
import CalendarView from '../CalendarView.vue'
import CommunityView from '../CommunityView.vue'
import DashboardView from '../DashboardView.vue'
import InboxView from '../InboxView.vue'
import NotesView from '../NotesView.vue'
import NotFoundView from '../NotFoundView.vue'
import PlanDetailView from '../PlanDetailView.vue'
import PlansView from '../PlansView.vue'
import PresenterDisplayView from '../PresenterDisplayView.vue'
import PresenterView from '../PresenterView.vue'
import SettingsView from '../SettingsView.vue'
import LoginView from '../auth/LoginView.vue'
import RegisterView from '../auth/RegisterView.vue'

const serviceMocks = vi.hoisted(() => ({
  auth: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    changePassword: vi.fn(),
  },
  bible: {
    getBooks: vi.fn(),
    getChapter: vi.fn(),
    getVerse: vi.fn(),
    search: vi.fn(),
  },
  notes: {
    getMyNotes: vi.fn(),
    getVerseNotes: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  plans: {
    getMyPlans: vi.fn(),
    getPlan: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
    recordProgress: vi.fn(),
    addDay: vi.fn(),
    publish: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
  },
  community: {
    getFeed: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    report: vi.fn(),
  },
}))

vi.mock('@/services/auth.service', () => ({
  authService: serviceMocks.auth,
}))

vi.mock('@/services/bible.service', async (importOriginal) => {
  const actual = await importOriginal<typeof BibleServiceModule>()
  return {
    ...actual,
    bibleService: serviceMocks.bible,
  }
})

vi.mock('@/services/notes.service', () => ({
  notesService: serviceMocks.notes,
}))

vi.mock('@/services/plans.service', () => ({
  plansService: serviceMocks.plans,
}))

vi.mock('@/services/community.service', () => ({
  communityService: serviceMocks.community,
}))

class NoopResizeObserver {
  observe() {}
  disconnect() {}
}

const now = '2026-05-05T12:00:00.000Z'

const user: User = {
  id: 'user-1',
  email: 'reader@example.com',
  displayName: 'Reader One',
  role: 'Pastor',
  churchId: 'church-1',
  isEmailVerified: true,
  isActive: true,
  createdAt: now,
}

const plan: ReadingPlan = {
  id: 'plan-1',
  title: 'Gospel in 7 Days',
  description: 'A short reading plan for the week.',
  status: 'Active',
  isPublic: true,
  createdBy: user.id,
  createdAt: now,
  days: [{ dayNumber: 1, title: 'John 1', verseRefs: ['JHN.1.1'] }],
  participants: [{ userId: user.id, displayName: user.displayName, currentDay: 0, joinedAt: now }],
}

function seedAuth() {
  const auth = useAuthStore()
  auth.user = user
}

function makeNotationSlide(): NotationSlide {
  return {
    source: 'notation',
    verseRef: 'notation-john-3-16',
    title: 'John 3:16',
    text: 'For God so loved the world',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #111827 0%, #0f766e 100%)',
      textTone: 'light',
    },
    elements: [
      {
        id: 'verse-1',
        kind: 'verse',
        reference: 'John 3:16',
        text: 'For God so loved the world',
        translation: 'KJV',
        showReference: true,
        x: 12,
        y: 32,
        width: 76,
        height: 20,
        fontSize: 48,
        color: '#ffffff',
        align: 'center',
        fontWeight: 'bold',
      },
    ],
  }
}

async function mountPage(
  component: Component,
  options: { path?: string; props?: Record<string, unknown>; prepare?: () => void } = {}
) {
  const RouteStub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: RouteStub },
      { path: '/calendar', name: 'calendar', component: RouteStub },
      { path: '/inbox', name: 'inbox', component: RouteStub },
      { path: '/bible', name: 'bible', component: RouteStub },
      { path: '/plans', name: 'plans', component: RouteStub },
      { path: '/plans/:id', name: 'plan-detail', component: RouteStub, props: true },
      { path: '/notes', name: 'notes', component: RouteStub },
      { path: '/presenter', name: 'presenter', component: RouteStub },
      { path: '/presenter-display', name: 'presenter-display', component: RouteStub },
      { path: '/community', name: 'community', component: RouteStub },
      { path: '/settings', name: 'settings', component: RouteStub },
      { path: '/login', name: 'login', component: RouteStub },
      { path: '/register', name: 'register', component: RouteStub },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: RouteStub },
    ],
  })

  seedAuth()
  options.prepare?.()
  await router.push(options.path ?? '/')
  await router.isReady()

  const wrapper = mount(component, {
    props: options.props,
    global: {
      plugins: [router],
      stubs: {
        Teleport: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('route page smoke tests', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('ResizeObserver', NoopResizeObserver)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    Element.prototype.scrollIntoView = vi.fn()

    serviceMocks.auth.register.mockResolvedValue({
      user,
      accessToken: 'access',
      expiresAt: '2026-05-05T13:00:00.000Z',
    })
    serviceMocks.auth.login.mockResolvedValue({
      user,
      accessToken: 'access',
      expiresAt: '2026-05-05T13:00:00.000Z',
    })
    serviceMocks.auth.logout.mockResolvedValue(undefined)
    serviceMocks.auth.refresh.mockResolvedValue({
      user,
      accessToken: 'access',
      expiresAt: '2026-05-05T13:00:00.000Z',
    })
    serviceMocks.auth.changePassword.mockResolvedValue(undefined)

    serviceMocks.bible.getBooks.mockResolvedValue(CANONICAL_BOOKS)
    serviceMocks.bible.getChapter.mockResolvedValue({ reference: 'Genesis 1', verses: [] })
    serviceMocks.bible.getVerse.mockResolvedValue({
      book: 'John',
      chapter: 3,
      verse: 16,
      text: 'For God so loved the world',
      translation: 'KJV',
    })
    serviceMocks.bible.search.mockResolvedValue([])

    serviceMocks.notes.getMyNotes.mockResolvedValue([])
    serviceMocks.notes.getVerseNotes.mockResolvedValue([])
    serviceMocks.notes.create.mockResolvedValue(undefined)
    serviceMocks.notes.update.mockResolvedValue(undefined)
    serviceMocks.notes.delete.mockResolvedValue(undefined)

    serviceMocks.plans.getMyPlans.mockResolvedValue([])
    serviceMocks.plans.getPlan.mockResolvedValue(plan)
    serviceMocks.plans.create.mockResolvedValue(plan)
    serviceMocks.plans.join.mockResolvedValue(undefined)
    serviceMocks.plans.recordProgress.mockResolvedValue(undefined)
    serviceMocks.plans.addDay.mockResolvedValue(plan)
    serviceMocks.plans.publish.mockResolvedValue(plan)
    serviceMocks.plans.archive.mockResolvedValue(plan)
    serviceMocks.plans.delete.mockResolvedValue(undefined)

    serviceMocks.community.getFeed.mockResolvedValue([])
    serviceMocks.community.create.mockResolvedValue(undefined)
    serviceMocks.community.update.mockResolvedValue(undefined)
    serviceMocks.community.delete.mockResolvedValue(undefined)
    serviceMocks.community.report.mockResolvedValue(undefined)
  })

  it.each([
    ['login', LoginView, '/login', 'Welcome back to SolaHub'],
    ['register', RegisterView, '/register', 'Create your account'],
    ['dashboard', DashboardView, '/', 'Open Bible'],
    ['calendar', CalendarView, '/calendar', 'Calendar'],
    ['community', CommunityView, '/community', 'Community'],
    ['inbox', InboxView, '/inbox', 'Inbox'],
    ['bible', BibleView, '/bible', 'Bible'],
    ['plans', PlansView, '/plans', 'Reading plans'],
    ['presenter', PresenterView, '/presenter', 'Presenter'],
    ['settings', SettingsView, '/settings', 'Settings'],
    ['not-found', NotFoundView, '/missing-page', 'Page not found'],
  ])('renders the %s page', async (_name, component, path, expectedText) => {
    const wrapper = await mountPage(component, { path })
    expect(wrapper.text()).toContain(expectedText)
    wrapper.unmount()
  })

  it('renders the plan detail page with a fetched plan', async () => {
    const wrapper = await mountPage(PlanDetailView, {
      path: '/plans/plan-1',
      props: { id: 'plan-1' },
    })

    expect(wrapper.text()).toContain('Gospel in 7 Days')
    wrapper.unmount()
  })

  it('does not render the dashboard overview section', async () => {
    const wrapper = await mountPage(DashboardView, { path: '/' })

    expect(wrapper.text()).not.toContain('Overview')
    expect(wrapper.text()).not.toContain('Active plans')
    expect(wrapper.text()).not.toContain('Drafts')
    wrapper.unmount()
  })

  it('renders the Notations page without fixed-height gaps in the slide rail', async () => {
    const wrapper = await mountPage(NotesView, {
      path: '/notes',
      prepare: () => {
        const notations = useNotationsStore()
        notations.addSlide()
        notations.addSlide()
      },
    })

    expect(wrapper.text()).toContain('Notations')
    expect(wrapper.get('[data-testid="notation-slide-list"]').classes()).toEqual(
      expect.arrayContaining(['flex', 'flex-col', 'gap-2'])
    )
    const cards = wrapper.findAll('[data-testid="notation-slide-card"]')
    expect(cards).toHaveLength(3)
    for (const card of cards) {
      expect(card.classes()).not.toContain('h-[158px]')
    }
    wrapper.unmount()
  })

  it('renders a presenter display slide when state has already arrived', async () => {
    const slide = makeNotationSlide()
    const presenter = usePresenterStore()
    presenter.applyDisplayState({
      type: 'state',
      slides: [slide],
      currentIndex: 0,
      isBlanked: false,
      planId: null,
    })

    const wrapper = await mountPage(PresenterDisplayView, { path: '/presenter-display' })

    expect(wrapper.text()).toContain('John 3:16')
    expect(wrapper.text()).toContain('For God so loved the world')
    expect(wrapper.text()).not.toContain('Waiting for presenter')
    wrapper.unmount()
  })

  it('loads the visible scripture chapter before jumping to a verse', async () => {
    serviceMocks.bible.getChapter.mockResolvedValue({
      reference: 'John 3',
      verses: [
        { book: 'John', chapter: 3, verse: 1, text: 'First scripture verse' },
        { book: 'John', chapter: 3, verse: 2, text: 'Second scripture verse' },
      ],
    })

    const wrapper = await mountPage(PresenterView, { path: '/presenter' })
    const johnButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('John') && button.text().includes('21 ch'))
    if (!johnButton) throw new Error('John book button not found')
    await johnButton.trigger('click')

    const chapterButton = wrapper.findAll('button').find((button) => button.text().trim() === '3')
    if (!chapterButton) throw new Error('John 3 chapter button not found')
    await chapterButton.trigger('click')
    await flushPromises()

    const presenter = usePresenterStore()
    presenter.loadSlides([makeNotationSlide()])
    expect(presenter.currentSlide?.source).toBe('notation')

    const verseButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Second scripture verse'))
    if (!verseButton) throw new Error('Second verse button not found')
    await verseButton.trigger('click')

    expect(presenter.currentSlide).toMatchObject({
      source: 'scripture',
      verse: 2,
      text: 'Second scripture verse',
    })
    wrapper.unmount()
  })
})
