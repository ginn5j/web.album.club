import type { CurrentAlbum } from '../../types/album'
import type { TagValue, DiscussionData } from '../../types/discussion'
import type { Member } from '../../types/member'
import type { WishlistItem } from '../../types/wishlist'

export interface OutputSettings {
  owner: string
  repo: string
  postsPath: string
  branch: string
  template?: string
}

export interface MemberSettingsData {
  publishPat?: string
  output?: OutputSettings
}

export interface StorageProvider {
  // Members
  getMembers(): Promise<Member[]>
  getMemberByUserId(userId: string): Promise<Member | null>
  upsertMember(data: { userId: string; displayName: string; role?: string }): Promise<Member>

  // Albums
  getCurrentAlbum(): Promise<CurrentAlbum | null>
  setCurrentAlbum(album: CurrentAlbum): Promise<void>

  // Tags (private until reveal)
  getTags(userId: string, albumId: string): Promise<Record<string, TagValue>>
  setTags(userId: string, albumId: string, tags: Record<string, TagValue>): Promise<void>

  // Notes (private until reveal)
  getNotes(userId: string, albumId: string): Promise<string>
  setNotes(userId: string, albumId: string, content: string): Promise<void>

  // Reveals
  getRevealForAlbum(albumId: string): Promise<{ userId: string; revealedAt: string } | null>
  createReveal(userId: string, albumId: string): Promise<{ revealedAt: string }>

  // Discussions
  getDiscussion(albumId: string): Promise<DiscussionData | null>
  upsertDiscussion(discussion: DiscussionData): Promise<void>
  listDiscussions(): Promise<DiscussionData[]>

  // Wishlist (per user)
  getWishlist(userId: string): Promise<WishlistItem[]>
  setWishlist(userId: string, items: WishlistItem[]): Promise<void>

  // Member settings (publish config)
  getMemberSettings(userId: string): Promise<MemberSettingsData | null>
  setMemberSettings(userId: string, settings: MemberSettingsData): Promise<void>

  // Invites
  createInvite(email: string, invitedByUserId: string): Promise<{ token: string }>
  acceptInvite(token: string, userId: string): Promise<void>
}

export interface RealtimeProvider {
  subscribeToCurrentAlbum(cb: (album: CurrentAlbum | null) => void): () => void
  subscribeToReveals(albumId: string, cb: (reveal: { userId: string; revealedAt: string }) => void): () => void
}

export interface BackendProvider {
  storage: StorageProvider
  realtime: RealtimeProvider
}
