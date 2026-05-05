import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { communityService } from '@/services/community.service'
import { isBrowserOffline } from '@/lib/networkStatus'
import type {
  CommunityFeed,
  CommunityPost,
  UpsertCommunityPostPayload,
} from '@/types/community.types'

const CACHE_TTL = 2 * 60_000

export const useCommunityStore = defineStore('community', () => {
  const everyonePosts = ref<CommunityPost[]>([])
  const minePosts = ref<CommunityPost[]>([])
  const hiddenPostIds = ref<Set<string>>(new Set())
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const lastFetchedAt = ref<Record<CommunityFeed, number>>({ everyone: 0, mine: 0 })

  const visibleEveryonePosts = computed(() =>
    everyonePosts.value.filter((post) => !hiddenPostIds.value.has(post.id))
  )

  function postsFor(feed: CommunityFeed): CommunityPost[] {
    return feed === 'everyone' ? visibleEveryonePosts.value : minePosts.value
  }

  async function fetchFeed(feed: CommunityFeed, force = false): Promise<void> {
    if (isBrowserOffline()) {
      error.value = null
      return
    }
    const cached = feed === 'everyone' ? everyonePosts.value : minePosts.value
    if (!force && cached.length > 0 && Date.now() - lastFetchedAt.value[feed] < CACHE_TTL) return

    isLoading.value = true
    error.value = null
    try {
      const posts = await communityService.getFeed(feed)
      if (feed === 'everyone') everyonePosts.value = posts
      else minePosts.value = posts
      lastFetchedAt.value[feed] = Date.now()
    } catch {
      error.value = 'Failed to load community posts.'
    } finally {
      isLoading.value = false
    }
  }

  async function create(payload: UpsertCommunityPostPayload): Promise<CommunityPost> {
    isSaving.value = true
    error.value = null
    try {
      const post = await communityService.create(payload)
      minePosts.value = [post, ...minePosts.value.filter((p) => p.id !== post.id)]
      if (post.visibility === 'Public') {
        everyonePosts.value = [post, ...everyonePosts.value.filter((p) => p.id !== post.id)]
      }
      invalidate()
      return post
    } catch (e) {
      error.value = 'Failed to publish community post.'
      throw e
    } finally {
      isSaving.value = false
    }
  }

  async function update(id: string, payload: UpsertCommunityPostPayload): Promise<CommunityPost> {
    isSaving.value = true
    error.value = null
    try {
      const post = await communityService.update(id, payload)
      replacePost(post)
      invalidate()
      return post
    } catch (e) {
      error.value = 'Failed to update community post.'
      throw e
    } finally {
      isSaving.value = false
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      await communityService.delete(id)
      everyonePosts.value = everyonePosts.value.filter((post) => post.id !== id)
      minePosts.value = minePosts.value.filter((post) => post.id !== id)
      hiddenPostIds.value = new Set([...hiddenPostIds.value].filter((postId) => postId !== id))
      invalidate()
    } catch (e) {
      error.value = 'Failed to delete community post.'
      throw e
    }
  }

  async function report(id: string, reason: string | null = null): Promise<void> {
    try {
      await communityService.report(id, { reason })
      hiddenPostIds.value = new Set([...hiddenPostIds.value, id])
      everyonePosts.value = everyonePosts.value.filter((post) => post.id !== id)
      invalidate()
    } catch (e) {
      error.value = 'Failed to report community post.'
      throw e
    }
  }

  function replacePost(post: CommunityPost): void {
    minePosts.value = minePosts.value.map((existing) => (existing.id === post.id ? post : existing))
    if (!minePosts.value.some((existing) => existing.id === post.id) && post.isMine) {
      minePosts.value = [post, ...minePosts.value]
    }

    if (post.visibility === 'Public') {
      everyonePosts.value = everyonePosts.value.map((existing) =>
        existing.id === post.id ? post : existing
      )
      if (!everyonePosts.value.some((existing) => existing.id === post.id)) {
        everyonePosts.value = [post, ...everyonePosts.value]
      }
    } else {
      everyonePosts.value = everyonePosts.value.filter((existing) => existing.id !== post.id)
    }
  }

  function invalidate(): void {
    lastFetchedAt.value = { everyone: 0, mine: 0 }
  }

  function reset(): void {
    everyonePosts.value = []
    minePosts.value = []
    hiddenPostIds.value = new Set()
    error.value = null
    lastFetchedAt.value = { everyone: 0, mine: 0 }
  }

  return {
    everyonePosts,
    minePosts,
    visibleEveryonePosts,
    isLoading,
    isSaving,
    error,
    postsFor,
    fetchFeed,
    create,
    update,
    remove,
    report,
    invalidate,
    reset,
  }
})
