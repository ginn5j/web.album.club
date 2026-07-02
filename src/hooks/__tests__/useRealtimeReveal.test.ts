import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRealtimeReveal } from '../useRealtimeReveal'
import { backend } from '../../lib/backends'

vi.mock('../../lib/backends', () => ({
  backend: {
    storage: {
      getRevealForAlbum: vi.fn(),
    },
    realtime: {
      subscribeToReveals: vi.fn(),
    },
  },
}))

const getRevealForAlbum = vi.mocked(backend.storage.getRevealForAlbum)
const subscribeToReveals = vi.mocked(backend.realtime.subscribeToReveals)

describe('useRealtimeReveal', () => {
  let revealCb: ((reveal: { userId: string; revealedAt: string }) => void) | null
  const unsubscribe = vi.fn()

  beforeEach(() => {
    revealCb = null
    getRevealForAlbum.mockResolvedValue(null)
    subscribeToReveals.mockImplementation((_albumId, cb) => {
      revealCb = cb
      return unsubscribe
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('reports an existing reveal found on mount', async () => {
    getRevealForAlbum.mockResolvedValue({ userId: 'u2', revealedAt: '2026-07-01T00:00:00Z' })
    const { result } = renderHook(() => useRealtimeReveal('album-1'))
    await act(async () => {})

    expect(result.current.revealed).toBe(true)
    expect(result.current.revealedByUserId).toBe('u2')
    expect(result.current.revealedAt).toBe('2026-07-01T00:00:00Z')
  })

  it('flips to revealed when the subscription delivers an event', async () => {
    const { result } = renderHook(() => useRealtimeReveal('album-1'))
    await act(async () => {})
    expect(result.current.revealed).toBe(false)

    act(() => revealCb!({ userId: 'u3', revealedAt: '2026-07-01T01:00:00Z' }))
    expect(result.current.revealed).toBe(true)
    expect(result.current.revealedByUserId).toBe('u3')
    // Once revealed the subscription is torn down — nothing left to hear.
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('markRevealed sets the state locally without a fetch', async () => {
    const { result } = renderHook(() => useRealtimeReveal('album-1'))
    await act(async () => {})

    act(() => result.current.markRevealed('u1', '2026-07-01T02:00:00Z'))
    expect(result.current.revealed).toBe(true)
    expect(result.current.revealedByUserId).toBe('u1')
  })

  it('surfaces a failed reveal check as an error', async () => {
    getRevealForAlbum.mockRejectedValue(new Error('connection lost'))
    const { result } = renderHook(() => useRealtimeReveal('album-1'))
    await act(async () => {})

    expect(result.current.error).toBe('connection lost')
    expect(result.current.revealed).toBe(false)
  })

  it('resets when the album changes', async () => {
    const { result, rerender } = renderHook(({ albumId }) => useRealtimeReveal(albumId), {
      initialProps: { albumId: 'album-1' },
    })
    await act(async () => {})
    act(() => revealCb!({ userId: 'u2', revealedAt: '2026-07-01T00:00:00Z' }))
    expect(result.current.revealed).toBe(true)

    await act(async () => {
      rerender({ albumId: 'album-2' })
    })
    expect(result.current.revealed).toBe(false)
    expect(result.current.revealedByUserId).toBeNull()
  })
})
