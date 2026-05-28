import { useState, useEffect, useCallback, useRef } from 'react'
import { backend } from '../lib/backends'

const AUTO_SAVE_DELAY_MS = 2000

export function useNotes(userId: string | null, albumId: string | null) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestNotesRef = useRef(notes)
  latestNotesRef.current = notes

  useEffect(() => {
    if (!userId || !albumId) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setNotes('')
    setError(null)
    backend.storage
      .getNotes(userId, albumId)
      .then(setNotes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load notes'))
  }, [userId, albumId])

  const save = useCallback(async () => {
    if (!userId || !albumId) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await backend.storage.setNotes(userId, albumId, latestNotesRef.current)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save notes')
    } finally {
      setSaving(false)
    }
  }, [userId, albumId])

  const onChange = useCallback(
    (value: string) => {
      setNotes(value)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(save, AUTO_SAVE_DELAY_MS)
    },
    [save],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { notes, onChange, saving, saved, error }
}
