import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWishlist } from '../useWishlist'
import { backend } from '../../lib/backends'
import type { WishlistItem } from '../../types/wishlist'

vi.mock('../../lib/backends', () => ({
  backend: {
    storage: {
      getWishlist: vi.fn(),
      setWishlist: vi.fn(),
    },
  },
}))

const getWishlist = vi.mocked(backend.storage.getWishlist)
const setWishlist = vi.mocked(backend.storage.setWishlist)

function makeItem(id: string, title: string): WishlistItem {
  return {
    id,
    addedAt: '2026-06-12T00:00:00Z',
    album: { title, artist: 'Artist' },
    source: 'manual',
  }
}

describe('useWishlist', () => {
  beforeEach(() => {
    getWishlist.mockResolvedValue([])
    setWishlist.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('a rapid second edit builds on the first instead of the last rendered list', async () => {
    const { result } = renderHook(() => useWishlist('user-1'))
    await act(async () => {})

    await act(async () => {
      void result.current.addItem(makeItem('a', 'First'))
      void result.current.addItem(makeItem('b', 'Second'))
    })

    expect(setWishlist).toHaveBeenLastCalledWith('user-1', [
      makeItem('a', 'First'),
      makeItem('b', 'Second'),
    ])
    expect(result.current.items).toHaveLength(2)
  })

  it('serializes saves so an earlier snapshot cannot reach the DB after a later one', async () => {
    const { result } = renderHook(() => useWishlist('user-1'))
    await act(async () => {})

    let resolveFirst!: () => void
    setWishlist.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveFirst = resolve }),
    )

    let first!: Promise<void>
    let second!: Promise<void>
    act(() => {
      first = result.current.addItem(makeItem('a', 'First'))
      second = result.current.addItem(makeItem('b', 'Second'))
    })
    await act(async () => {})

    expect(setWishlist).toHaveBeenCalledTimes(1)
    expect(setWishlist).toHaveBeenCalledWith('user-1', [makeItem('a', 'First')])

    await act(async () => {
      resolveFirst()
      await Promise.all([first, second])
    })
    expect(setWishlist).toHaveBeenCalledTimes(2)
    expect(setWishlist).toHaveBeenLastCalledWith('user-1', [
      makeItem('a', 'First'),
      makeItem('b', 'Second'),
    ])
  })

  it('removeItem removes only the item with the matching id', async () => {
    getWishlist.mockResolvedValue([makeItem('a', 'Keep'), makeItem('b', 'Drop')])
    const { result } = renderHook(() => useWishlist('user-1'))
    await act(async () => {})

    await act(async () => {
      await result.current.removeItem('b')
    })

    expect(setWishlist).toHaveBeenLastCalledWith('user-1', [makeItem('a', 'Keep')])
  })

  it('reorderItems moves an item to the target index', async () => {
    getWishlist.mockResolvedValue([
      makeItem('a', 'One'),
      makeItem('b', 'Two'),
      makeItem('c', 'Three'),
    ])
    const { result } = renderHook(() => useWishlist('user-1'))
    await act(async () => {})

    await act(async () => {
      await result.current.reorderItems(2, 0)
    })

    expect(setWishlist).toHaveBeenLastCalledWith('user-1', [
      makeItem('c', 'Three'),
      makeItem('a', 'One'),
      makeItem('b', 'Two'),
    ])
  })

  it('surfaces a failed save as an error', async () => {
    const { result } = renderHook(() => useWishlist('user-1'))
    await act(async () => {})

    setWishlist.mockRejectedValueOnce(new Error('network down'))
    await act(async () => {
      await result.current.addItem(makeItem('a', 'First'))
    })

    expect(result.current.error).toBe('network down')
  })
})
