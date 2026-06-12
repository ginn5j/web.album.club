import { supabase } from './client'
import { supabaseStorage } from './storage'
import type { RealtimeProvider } from '../types'

export const supabaseRealtime: RealtimeProvider = {
  subscribeToCurrentAlbum(cb) {
    const channel = supabase
      .channel('albums-current')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'albums' }, () => {
        supabaseStorage.getCurrentAlbum().then((album) => {
          // Ignore null: during album swap the DELETE fires before the INSERT,
          // briefly returning null. The INSERT event delivers the new album.
          if (album !== null) cb(album)
        }).catch(() => {})
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
      .subscribe((status: string) => {
        // A reveal inserted between the caller's initial check and the channel
        // going live (or while reconnecting) emits no event, leaving the client
        // un-revealed until refresh — so re-check on every (re)subscribe.
        if (status === 'SUBSCRIBED') {
          supabaseStorage
            .getRevealForAlbum(albumId)
            .then((reveal) => {
              if (reveal) cb(reveal)
            })
            .catch(() => {})
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  },
}
