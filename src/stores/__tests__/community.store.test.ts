import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCommunityStore } from '../community.store'
import type { CommunityPost } from '@/types/community.types'

vi.mock('@/services/community.service', () => ({
  communityService: {
    getFeed: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    report: vi.fn(),
  },
}))

const { communityService } = await import('@/services/community.service')

const makePost = (overrides: Partial<CommunityPost> = {}): CommunityPost => ({
  id: 'post-1',
  authorId: 'user-1',
  authorDisplayName: 'Reader One',
  kind: 'Post',
  visibility: 'Public',
  title: 'Sunday',
  body: 'A short recap',
  verseRef: null,
  tags: [],
  deck: null,
  createdAt: '2026-05-05T12:00:00Z',
  updatedAt: '2026-05-05T12:00:00Z',
  isMine: true,
  hasReported: false,
  ...overrides,
})

describe('community store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setOnlineStatus(true)
  })

  it('loads the requested feed', async () => {
    const post = makePost()
    vi.mocked(communityService.getFeed).mockResolvedValue([post])

    const store = useCommunityStore()
    await store.fetchFeed('everyone')

    expect(communityService.getFeed).toHaveBeenCalledWith('everyone')
    expect(store.visibleEveryonePosts).toEqual([post])
  })

  it('skips loading while offline', async () => {
    setOnlineStatus(false)

    const store = useCommunityStore()
    await store.fetchFeed('everyone')

    expect(communityService.getFeed).not.toHaveBeenCalled()
    expect(store.error).toBeNull()
  })

  it('adds created posts to mine and everyone when public', async () => {
    const post = makePost({ id: 'post-new', visibility: 'Public' })
    vi.mocked(communityService.create).mockResolvedValue(post)

    const store = useCommunityStore()
    await store.create({
      kind: 'Post',
      visibility: 'Public',
      title: 'Sunday',
      body: 'A short recap',
      verseRef: null,
      tags: [],
      deck: null,
    })

    expect(store.minePosts[0].id).toBe('post-new')
    expect(store.visibleEveryonePosts[0].id).toBe('post-new')
  })

  it('hides reported posts from the everyone feed', async () => {
    const post = makePost({ id: 'post-report' })
    vi.mocked(communityService.getFeed).mockResolvedValue([post])
    vi.mocked(communityService.report).mockResolvedValue(undefined)

    const store = useCommunityStore()
    await store.fetchFeed('everyone')
    await store.report('post-report')

    expect(communityService.report).toHaveBeenCalledWith('post-report', { reason: null })
    expect(store.visibleEveryonePosts).toEqual([])
  })

  it('removes deleted posts from both feeds', async () => {
    const post = makePost({ id: 'post-delete' })
    vi.mocked(communityService.getFeed).mockResolvedValue([post])
    vi.mocked(communityService.delete).mockResolvedValue(undefined)

    const store = useCommunityStore()
    await store.fetchFeed('everyone')
    store.minePosts = [post]
    await store.remove('post-delete')

    expect(store.visibleEveryonePosts).toEqual([])
    expect(store.minePosts).toEqual([])
  })
})

function setOnlineStatus(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  })
}
