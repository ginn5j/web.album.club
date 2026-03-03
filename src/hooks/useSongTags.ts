import { useState, useEffect, useCallback } from 'react'
import { readTags, writeTags } from '../lib/storage/tags'
import type { TagValue } from '../types/discussion'
import type { LocalSettings } from '../lib/settings'

export function useSongTags(
  settings: LocalSettings | null,
  branch: string | null,
  albumId: string | null,
) {
  const [tags, setTags] = useState<Record<string, TagValue>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!settings || !branch || !albumId) return
    setTags({})
    setError(null)
    readTags(settings.pat, settings.repoOwner, settings.repoName, branch, albumId)
      .then((file) => {
        if (file) setTags(file.tags)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load tags'))
  }, [settings, branch, albumId])

  const setTag = useCallback(
    async (position: number, tag: TagValue | null) => {
      if (!settings || !branch || !albumId) return
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
        await writeTags(settings.pat, settings.repoOwner, settings.repoName, branch, albumId, next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save tags')
      } finally {
        setSaving(false)
      }
    },
    [settings, branch, albumId, tags],
  )

  return { tags, setTag, saving, error }
}
