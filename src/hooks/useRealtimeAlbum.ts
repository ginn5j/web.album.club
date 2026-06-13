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
  enabled = true,
): UseRealtimeAlbumResult {
  const [currentAlbum, setCurrentAlbum] = useState<CurrentAlbum | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const album = await backend.storage.getCurrentAlbum()
      // Clear any stale error: callers treat a set error as fatal (HomePage
      // renders only the banner), so it must not outlive a successful fetch.
      setError(null)
      setCurrentAlbum((prev) => {
        if (album && prev && album.id !== prev.id && onAlbumChanged) {
          onAlbumChanged(album)
        }
        return album
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load album')
    }
  }, [onAlbumChanged, enabled])

  // Initial load
  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    backend.storage
      .getCurrentAlbum()
      .then((album) => {
        setError(null)
        setCurrentAlbum(album)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load album'))
      .finally(() => setLoading(false))
  }, [enabled])

  // Realtime subscription — re-fetch on any albums table change
  useEffect(() => {
    if (!enabled) return
    const unsubscribe = backend.realtime.subscribeToCurrentAlbum((album) => {
      // The subscription only delivers successful fetches, so any earlier
      // load error is stale by now.
      setError(null)
      setCurrentAlbum((prev) => {
        if (album && prev && album.id !== prev.id && onAlbumChanged) {
          onAlbumChanged(album)
        }
        return album
      })
    })
    return unsubscribe
  }, [onAlbumChanged, enabled])

  return { currentAlbum, loading, error, refresh }
}
