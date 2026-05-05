import type { NotationDeck } from './presenter.types'

export type CommunityFeed = 'everyone' | 'mine'
export type CommunityPostKind = 'Post' | 'FavouriteVerse' | 'NotationDeck'
export type CommunityVisibility = 'Private' | 'Public'

export interface CommunityPost {
  id: string
  authorId: string
  authorDisplayName: string
  kind: CommunityPostKind
  visibility: CommunityVisibility
  title: string
  body: string
  verseRef: string | null
  tags: string[]
  deck: NotationDeck | null
  createdAt: string
  updatedAt: string
  isMine: boolean
  hasReported: boolean
}

export interface UpsertCommunityPostPayload {
  kind: CommunityPostKind
  visibility: CommunityVisibility
  title: string
  body: string
  verseRef: string | null
  tags: string[]
  deck: NotationDeck | null
}

export interface ReportCommunityPostPayload {
  reason: string | null
}
