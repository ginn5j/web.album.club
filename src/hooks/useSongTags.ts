import { useState, useEffect, useCallback, useRef } from 'react'
import { backend } from '../lib/backends'
import type { TagValue } from '../types/discussion'

export function useSongTags(userId: string | null, albumId: string | null) {
  const [tags, setTags] = useState<Record<string, TagValue>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Latest tags including edits not yet reflected in state — a second tap
  // before React re-renders must build on the first tap, not overwrite it.
  const tagsRef = useRef<Record<string, TagValue>>({})
  // Saves are chained so an earlier (smaller) snapshot can't reach the DB
  // after a later one and win.
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve())
  const pendingSavesRef = useRef(0)

  useEffect(() => {
    if (!userId || !albumId) return
    tagsRef.current = {}
    setTags({})
    setError(null)
    backend.storage
      .getTags(userId, albumId)
      .then((loaded) => {
        tagsRef.current = loaded
        setTags(loaded)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load tags'))
  }, [userId, albumId])

  const setTag = useCallback(
    async (position: number, tag: TagValue | null) => {
      if (!userId || !albumId) return
      const uid = userId
      const aid = albumId
      const next = { ...tagsRef.current }
      if (tag === null) {
        delete next[String(position)]
      } else {
        next[String(position)] = tag
      }
      tagsRef.current = next
      setTags(next)
      pendingSavesRef.current++
      setSaving(true)
      setError(null)
      const save = saveChainRef.current.then(() => backend.storage.setTags(uid, aid, next))
      saveChainRef.current = save.catch(() => {})
      try {
        await save
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save tags')
      } finally {
        pendingSavesRef.current--
        if (pendingSavesRef.current === 0) setSaving(false)
      }
    },
    [userId, albumId],
  )

  return { tags, setTag, saving, error }
}
