import { useState, useEffect, useCallback } from 'react'
import { backend } from '../lib/backends'
import type { CurrentAlbum } from '../types/album'

interface UseRealtimeAlbumResult {
  currentAlbum: CurrentAlbum | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useRealtimeAlbum(
  onAlbumChanged?: (album: CurrentAlbum) => void,
): UseRealtimeAlbumResult {
  const [currentAlbum, setCurrentAlbum] = useState<CurrentAlbum | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const album = await backend.storage.getCurrentAlbum()
      setCurrentAlbum((prev) => {
        if (album && prev && album.id !== prev.id && onAlbumChanged) {
          onAlbumChanged(album)
        }
        return album
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load album')
    }
  }, [onAlbumChanged])

  // Initial load
  useEffect(() => {
    backend.storage
      .getCurrentAlbum()
      .then(setCurrentAlbum)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load album'))
      .finally(() => setLoading(false))
  }, [])

  // Realtime subscription — re-fetch on any albums table change
  useEffect(() => {
    const unsubscribe = backend.realtime.subscribeToCurrentAlbum((album) => {
      setCurrentAlbum((prev) => {
        if (album && prev && album.id !== prev.id && onAlbumChanged) {
          onAlbumChanged(album)
        }
        return album
      })
    })
    return unsubscribe
  }, [onAlbumChanged])

  return { currentAlbum, loading, error, refresh }
}
