import { useState, useEffect, useCallback } from 'react'
import { backend } from '../lib/backends'
import type { WishlistItem } from '../types/wishlist'

export function useWishlist(userId: string | null) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    backend.storage
      .getWishlist(userId)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load wishlist'))
      .finally(() => setLoading(false))
  }, [userId])

  const save = useCallback(
    async (nextItems: WishlistItem[]) => {
      if (!userId) return
      setError(null)
      try {
        await backend.storage.setWishlist(userId, nextItems)
        setItems(nextItems)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save wishlist')
      }
    },
    [userId],
  )

  const addItem = useCallback((item: WishlistItem) => save([...items, item]), [items, save])
  const removeItem = useCallback((id: string) => save(items.filter((i) => i.id !== id)), [items, save])
  const updateItem = useCallback(
    (id: string, note: string) => save(items.map((i) => (i.id === id ? { ...i, note: note || undefined } : i))),
    [items, save],
  )
  const reorderItems = useCallback(
    (fromIndex: number, toIndex: number) => {
      const next = [...items]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return save(next)
    },
    [items, save],
  )

  return { items, loading, error, addItem, removeItem, updateItem, reorderItems }
}
