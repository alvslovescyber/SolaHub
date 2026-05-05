import { http } from './http/client'
import type {
  CommunityFeed,
  CommunityPost,
  ReportCommunityPostPayload,
  UpsertCommunityPostPayload,
} from '@/types/community.types'

export const communityService = {
  async getFeed(feed: CommunityFeed, take = 30, before?: string): Promise<CommunityPost[]> {
    const res = await http.get<CommunityPost[]>('/api/community', {
      params: { feed, take, before },
    })
    return res.data
  },

  async create(payload: UpsertCommunityPostPayload): Promise<CommunityPost> {
    const res = await http.post<CommunityPost>('/api/community', payload)
    return res.data
  },

  async update(id: string, payload: UpsertCommunityPostPayload): Promise<CommunityPost> {
    const res = await http.put<CommunityPost>(`/api/community/${id}`, payload)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await http.delete(`/api/community/${id}`)
  },

  async report(id: string, payload: ReportCommunityPostPayload): Promise<void> {
    await http.post(`/api/community/${id}/reports`, payload)
  },
}
