import { useState, useEffect, useRef } from 'react'
import { searchReleaseGroups, type ReleaseGroupResult } from '../lib/musicbrainz/releaseGroups'
import { MB_DEBOUNCE_MS } from '../constants/config'

export function useReleaseGroupSearch(query: string, artistMbid?: string) {
  const [results, setResults] = useState<ReleaseGroupResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setError(null)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await searchReleaseGroups(query, artistMbid)
        setResults(res)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, MB_DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, artistMbid])

  return { results, loading, error }
}
