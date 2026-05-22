import { supabase } from './client'
import { supabaseStorage } from './storage'
import type { RealtimeProvider } from '../types'

export const supabaseRealtime: RealtimeProvider = {
  subscribeToCurrentAlbum(cb) {
    const channel = supabase
      .channel('albums-current')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'albums' }, () => {
        supabaseStorage.getCurrentAlbum().then(cb).catch(() => {})
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  subscribeToReveals(albumId, cb) {
    const channel = supabase
      .channel(`reveals-${albumId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reveals', filter: `album_id=eq.${albumId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          cb({ userId: row.user_id as string, revealedAt: row.revealed_at as string })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}
