import { useState, useEffect, useCallback, useRef } from 'react'
import { backend } from '../lib/backends'

const AUTO_SAVE_DELAY_MS = 2000

export function useNotes(userId: string | null, albumId: string | null) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The edit awaiting the debounced save. Captures userId/albumId at edit time
  // so a flush during an album switch writes to the round that was edited.
  const pendingRef = useRef<{ userId: string; albumId: string; content: string } | null>(null)

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    setSaving(true)
    setSaved(false)
    setError(null)
    backend.storage
      .setNotes(pending.userId, pending.albumId, pending.content)
      .then(() => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to save notes'))
      .finally(() => setSaving(false))
  }, [])

  useEffect(() => {
    if (!userId || !albumId) return
    setNotes('')
    setError(null)
    backend.storage
      .getNotes(userId, albumId)
      .then(setNotes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load notes'))
    // Cleanup flushes any edit still waiting on the debounce — on unmount
    // (navigation) and before switching albums — so it isn't silently lost.
    return flush
  }, [userId, albumId, flush])

  const onChange = useCallback(
    (value: string) => {
      setNotes(value)
      if (!userId || !albumId) return
      pendingRef.current = { userId, albumId, content: value }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(flush, AUTO_SAVE_DELAY_MS)
    },
    [userId, albumId, flush],
  )

  return { notes, onChange, saving, saved, error }
}
