import { useState, useEffect, useCallback, useRef } from 'react'
import { backend } from '../lib/backends'
import type { WishlistItem } from '../types/wishlist'

export function useWishlist(userId: string | null) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Latest items including edits not yet rendered — a second quick edit must
  // build on the first, not on the last rendered list.
  const itemsRef = useRef<WishlistItem[]>([])
  // Saves are chained so an earlier (smaller) snapshot can't reach the DB
  // after a later one and win.
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    backend.storage
      .getWishlist(userId)
      .then((loaded) => {
        itemsRef.current = loaded
        setItems(loaded)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load wishlist'))
      .finally(() => setLoading(false))
  }, [userId])

  const save = useCallback(
    async (nextItems: WishlistItem[]) => {
      if (!userId) return
      setError(null)
      itemsRef.current = nextItems
      setItems(nextItems)
      const saved = saveChainRef.current.then(() => backend.storage.setWishlist(userId, nextItems))
      saveChainRef.current = saved.catch(() => {})
      try {
        await saved
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save wishlist')
      }
    },
    [userId],
  )

  const addItem = useCallback((item: WishlistItem) => save([...itemsRef.current, item]), [save])
  const removeItem = useCallback(
    (id: string) => save(itemsRef.current.filter((i) => i.id !== id)),
    [save],
  )
  const updateItem = useCallback(
    (id: string, note: string) =>
      save(itemsRef.current.map((i) => (i.id === id ? { ...i, note: note || undefined } : i))),
    [save],
  )
  const reorderItems = useCallback(
    (fromIndex: number, toIndex: number) => {
      const next = [...itemsRef.current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return save(next)
    },
    [save],
  )

  return { items, loading, error, addItem, removeItem, updateItem, reorderItems }
}
