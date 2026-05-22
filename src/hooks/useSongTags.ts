import { useState, useEffect, useCallback } from 'react'
import { backend } from '../lib/backends'
import type { TagValue } from '../types/discussion'

export function useSongTags(userId: string | null, albumId: string | null) {
  const [tags, setTags] = useState<Record<string, TagValue>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || !albumId) return
    setTags({})
    setError(null)
    backend.storage
      .getTags(userId, albumId)
      .then(setTags)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load tags'))
  }, [userId, albumId])

  const setTag = useCallback(
    async (position: number, tag: TagValue | null) => {
      if (!userId || !albumId) return
      const next = { ...tags }
      if (tag === null) {
        delete next[String(position)]
      } else {
        next[String(position)] = tag
      }
      setTags(next)
      setSaving(true)
      setError(null)
      try {
        await backend.storage.setTags(userId, albumId, next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save tags')
      } finally {
        setSaving(false)
      }
    },
    [userId, albumId, tags],
  )

  return { tags, setTag, saving, error }
}
