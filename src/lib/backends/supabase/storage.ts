import { supabase } from './client'
import type { StorageProvider, MemberSettingsData } from '../types'
import type { CurrentAlbum } from '../../../types/album'
import type { TagValue, DiscussionData } from '../../../types/discussion'
import type { Member } from '../../../types/member'
import type { WishlistItem } from '../../../types/wishlist'

function rowToMember(row: Record<string, unknown>): Member {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    displayName: row.display_name as string,
    role: row.role as 'admin' | 'member',
    createdAt: row.created_at as string,
  }
}

export const supabaseStorage: StorageProvider = {
  async getMembers() {
    const { data, error } = await supabase.from('members').select('*').order('created_at')
    if (error) throw error
    return (data ?? []).map(rowToMember)
  },

  async getMemberByUserId(userId) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data ? rowToMember(data as Record<string, unknown>) : null
  },

  async upsertMember({ userId, displayName, role = 'member' }) {
    const { data, error } = await supabase
      .from('members')
      .upsert({ user_id: userId, display_name: displayName, role }, { onConflict: 'user_id' })
      .select()
      .single()
    if (error) throw error
    return rowToMember(data as Record<string, unknown>)
  },

  async getCurrentAlbum() {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('is_current', true)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const row = data as Record<string, unknown>
    const info = row.album_info as {
      title: string; artist: string; releaseYear?: number
      genre?: string; coverArtUrl?: string; mbid?: string; selectedBy: string
    }
    return {
      schemaVersion: 1 as const,
      id: row.album_id as string,
      source: row.source as 'musicbrainz' | 'manual',
      selectedAt: row.selected_at as string,
      selectedBy: info.selectedBy,
      album: {
        title: info.title,
        artist: info.artist,
        releaseYear: info.releaseYear,
        genre: info.genre,
        coverArtUrl: info.coverArtUrl,
        mbid: info.mbid,
      },
      songs: row.songs as CurrentAlbum['songs'],
    }
  },

  async setCurrentAlbum(album) {
    // Deactivate current album first, then upsert new one
    await supabase.from('albums').update({ is_current: false }).eq('is_current', true)
    const { error } = await supabase.from('albums').upsert(
      {
        album_id: album.id,
        source: album.source,
        album_info: { ...album.album, selectedBy: album.selectedBy },
        songs: album.songs,
        selected_at: album.selectedAt,
        is_current: true,
      },
      { onConflict: 'album_id' },
    )
    if (error) throw error
  },

  async getTags(userId, albumId) {
    const { data, error } = await supabase
      .from('tags')
      .select('tags')
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .maybeSingle()
    if (error) throw error
    return (data?.tags as Record<string, TagValue>) ?? {}
  },

  async setTags(userId, albumId, tags) {
    const { error } = await supabase.from('tags').upsert(
      { user_id: userId, album_id: albumId, tags, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,album_id' },
    )
    if (error) throw error
  },

  async getNotes(userId, albumId) {
    const { data, error } = await supabase
      .from('notes')
      .select('content')
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .maybeSingle()
    if (error) throw error
    return (data?.content as string) ?? ''
  },

  async setNotes(userId, albumId, content) {
    const { error } = await supabase.from('notes').upsert(
      { user_id: userId, album_id: albumId, content, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,album_id' },
    )
    if (error) throw error
  },

  async getRevealForAlbum(albumId) {
    const { data, error } = await supabase
      .from('reveals')
      .select('user_id, revealed_at')
      .eq('album_id', albumId)
      .order('revealed_at')
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return { userId: data.user_id as string, revealedAt: data.revealed_at as string }
  },

  async createReveal(userId, albumId) {
    const revealedAt = new Date().toISOString()
    const { error } = await supabase
      .from('reveals')
      .upsert({ user_id: userId, album_id: albumId, revealed_at: revealedAt }, { onConflict: 'user_id,album_id' })
    if (error) throw error
    return { revealedAt }
  },

  async getDiscussion(albumId) {
    const { data, error } = await supabase
      .from('discussions')
      .select('data')
      .eq('album_id', albumId)
      .maybeSingle()
    if (error) throw error
    return data ? (data.data as DiscussionData) : null
  },

  async upsertDiscussion(discussion) {
    const { error } = await supabase
      .from('discussions')
      .upsert({ album_id: discussion.albumId, data: discussion }, { onConflict: 'album_id' })
    if (error) throw error
  },

  async listDiscussions() {
    const { data, error } = await supabase
      .from('discussions')
      .select('data')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => (row as Record<string, unknown>).data as DiscussionData)
  },

  async getWishlist(userId) {
    const { data, error } = await supabase
      .from('wishlists')
      .select('items')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return (data?.items as WishlistItem[]) ?? []
  },

  async setWishlist(userId, items) {
    const { error } = await supabase.from('wishlists').upsert(
      { user_id: userId, items, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    if (error) throw error
  },

  async getMemberSettings(userId) {
    const { data, error } = await supabase
      .from('member_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const row = data as Record<string, unknown>
    const result: MemberSettingsData = {}
    if (row.publish_pat) result.publishPat = row.publish_pat as string
    if (row.output_owner && row.output_repo) {
      result.output = {
        owner: row.output_owner as string,
        repo: row.output_repo as string,
        postsPath: (row.output_posts_path as string) ?? '_posts',
        branch: (row.output_branch as string) ?? 'main',
        template: row.output_template as string | undefined,
      }
    }
    return result
  },

  async setMemberSettings(userId, settings) {
    const { error } = await supabase.from('member_settings').upsert(
      {
        user_id: userId,
        publish_pat: settings.publishPat ?? null,
        output_owner: settings.output?.owner ?? null,
        output_repo: settings.output?.repo ?? null,
        output_posts_path: settings.output?.postsPath ?? '_posts',
        output_branch: settings.output?.branch ?? 'main',
        output_template: settings.output?.template ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) throw error
  },

  async createInvite(email, invitedByUserId) {
    const token = crypto.randomUUID()
    const { error } = await supabase.from('invites').insert({
      email,
      token,
      invited_by: invitedByUserId,
    })
    if (error) throw error
    return { token }
  },

  async acceptInvite(token, userId) {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Invite not found or expired')
    const { error: updateError } = await supabase
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', (data as Record<string, unknown>).id)
    if (updateError) throw updateError
    // Mark the user as a member (display name will be set during onboarding)
    const { error: memberError } = await supabase
      .from('members')
      .upsert({ user_id: userId, display_name: (data as Record<string, unknown>).email as string, role: 'member' }, { onConflict: 'user_id' })
    if (memberError) throw memberError
  },
}
