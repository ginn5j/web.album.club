import { useState, useEffect, useRef } from 'react'
import { MB_DEBOUNCE_MS } from '../constants/config'

// Shared debounce + fetch state machine for the MusicBrainz search hooks.
// Responses are sequence-checked so a slow response for an old query can't
// overwrite the results of a newer one. `search` must be referentially
// stable (a module-level function or useCallback) or every render re-runs
// the effect.
export function useDebouncedSearch<T>(query: string, search: (q: string) => Promise<T[]>) {
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    const seq = ++seqRef.current
    if (!query.trim()) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await search(query)
        if (seqRef.current !== seq) return
        setResults(res)
      } catch (e) {
        if (seqRef.current !== seq) return
        setError(e instanceof Error ? e.message : 'Search failed')
        setResults([])
      } finally {
        if (seqRef.current === seq) setLoading(false)
      }
    }, MB_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, search])

  return { results, loading, error }
}
