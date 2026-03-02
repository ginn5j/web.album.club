import { useState, useEffect, useRef, useCallback } from 'react'
import { readCurrentAlbum } from '../lib/storage/album'
import { POLL_INTERVAL_MS } from '../constants/config'
import type { CurrentAlbum } from '../types/album'
import type { LocalSettings } from '../lib/settings'

interface UseActiveAlbumResult {
  currentAlbum: CurrentAlbum | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useActiveAlbum(
  settings: LocalSettings | null,
  onAlbumChanged?: (album: CurrentAlbum) => void,
): UseActiveAlbumResult {
  const [currentAlbum, setCurrentAlbum] = useState<CurrentAlbum | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevIdRef = useRef<string | null>(null)

  const fetch = useCallback(async () => {
    if (!settings) return
    try {
      const album = await readCurrentAlbum(settings.pat, settings.repoOwner, settings.repoName, true)
      if (album && album.id !== prevIdRef.current) {
        if (prevIdRef.current !== null && onAlbumChanged) {
          onAlbumChanged(album)
        }
        prevIdRef.current = album.id
        setCurrentAlbum(album)
      } else if (!album) {
        setCurrentAlbum(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load album')
    }
  }, [settings, onAlbumChanged])

  const initialLoad = useCallback(async () => {
    if (!settings) return
    setLoading(true)
    try {
      const album = await readCurrentAlbum(settings.pat, settings.repoOwner, settings.repoName)
      setCurrentAlbum(album)
      prevIdRef.current = album?.id ?? null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load album')
    } finally {
      setLoading(false)
    }
  }, [settings])

  useEffect(() => {
    initialLoad()
  }, [initialLoad])

  useEffect(() => {
    if (!settings) return

    const interval = setInterval(fetch, POLL_INTERVAL_MS)

    const handleVisibility = () => {
      if (!document.hidden) fetch()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [settings, fetch])

  return { currentAlbum, loading, error, refresh: initialLoad }
}
