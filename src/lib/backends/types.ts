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
  // role is never written by the app: the members INSERT/UPDATE grants are
  // column-restricted (005_role_protection.sql) so it always comes from the
  // DB default; admins are promoted via SQL (see README).
  upsertMember(data: { userId: string; displayName: string }): Promise<Member>

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
  // Insert only if no discussion exists for the album (first writer wins).
  // Used for the post-reveal merge so a concurrent client can't overwrite it.
  createDiscussion(discussion: DiscussionData): Promise<void>
  upsertDiscussion(discussion: DiscussionData): Promise<void>
  listDiscussions(): Promise<DiscussionData[]>

  // Wishlist (per user)
  getWishlist(userId: string): Promise<WishlistItem[]>
  setWishlist(userId: string, items: WishlistItem[]): Promise<void>

  // Member settings (publish config)
  getMemberSettings(userId: string): Promise<MemberSettingsData | null>
  setMemberSettings(userId: string, settings: MemberSettingsData): Promise<void>
}

export interface RealtimeProvider {
  subscribeToCurrentAlbum(cb: (album: CurrentAlbum | null) => void): () => void
  subscribeToReveals(albumId: string, cb: (reveal: { userId: string; revealedAt: string }) => void): () => void
}

export interface BackendProvider {
  storage: StorageProvider
  realtime: RealtimeProvider
}
