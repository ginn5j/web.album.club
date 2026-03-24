import { useState, useEffect, useCallback } from 'react'
import { readWishlist, writeWishlist } from '../lib/storage/wishlist'
import type { WishlistItem, WishlistFile } from '../types/wishlist'
import type { LocalSettings } from '../lib/settings'

export function useWishlist(settings: LocalSettings | null, branch: string | null) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!settings || !branch) return
    setLoading(true)
    readWishlist(settings.pat, settings.repoOwner, settings.repoName, branch)
      .then((file) => {
        if (file) setItems(file.items)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load wishlist'))
      .finally(() => setLoading(false))
  }, [settings, branch])

  const save = useCallback(
    async (nextItems: WishlistItem[]) => {
      if (!settings || !branch) return
      setSaving(true)
      setError(null)
      const file: WishlistFile = {
        updatedAt: new Date().toISOString(),
        items: nextItems,
      }
      try {
        await writeWishlist(settings.pat, settings.repoOwner, settings.repoName, branch, file)
        setItems(nextItems)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save wishlist')
      } finally {
        setSaving(false)
      }
    },
    [settings, branch],
  )

  const addItem = useCallback(
    (item: WishlistItem) => save([...items, item]),
    [items, save],
  )

  const removeItem = useCallback(
    (id: string) => save(items.filter((i) => i.id !== id)),
    [items, save],
  )

  const updateItem = useCallback(
    (id: string, note: string) =>
      save(items.map((i) => (i.id === id ? { ...i, note: note || undefined } : i))),
    [items, save],
  )

  return { items, loading, saving, error, addItem, removeItem, updateItem }
}
