import { useState, useEffect, useCallback, useRef } from 'react'
import { readNotes, writeNotes } from '../lib/storage/notes'
import type { LocalSettings } from '../lib/settings'

const AUTO_SAVE_DELAY_MS = 2000

export function useNotes(
  settings: LocalSettings | null,
  branch: string | null,
  albumId: string | null,
) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestNotesRef = useRef(notes)
  latestNotesRef.current = notes

  useEffect(() => {
    if (!settings || !branch || !albumId) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setNotes('')
    setError(null)
    readNotes(settings.pat, settings.repoOwner, settings.repoName, branch, albumId)
      .then((file) => {
        if (file) setNotes(file.notes)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load notes'))
  }, [settings, branch, albumId])

  const save = useCallback(async () => {
    if (!settings || !branch || !albumId) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await writeNotes(
        settings.pat,
        settings.repoOwner,
        settings.repoName,
        branch,
        albumId,
        latestNotesRef.current,
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save notes')
    } finally {
      setSaving(false)
    }
  }, [settings, branch, albumId])

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
