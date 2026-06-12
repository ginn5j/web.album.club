import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotes } from '../useNotes'
import { backend } from '../../lib/backends'

vi.mock('../../lib/backends', () => ({
  backend: {
    storage: {
      getNotes: vi.fn(),
      setNotes: vi.fn(),
    },
  },
}))

const getNotes = vi.mocked(backend.storage.getNotes)
const setNotes = vi.mocked(backend.storage.setNotes)

describe('useNotes', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    getNotes.mockResolvedValue('')
    setNotes.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('saves after the debounce delay', async () => {
    const { result } = renderHook(() => useNotes('user-1', 'album-1'))
    await act(async () => {})

    act(() => result.current.onChange('first draft'))
    expect(setNotes).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(setNotes).toHaveBeenCalledTimes(1)
    expect(setNotes).toHaveBeenCalledWith('user-1', 'album-1', 'first draft')
  })

  it('flushes a pending edit on unmount instead of dropping it', async () => {
    const { result, unmount } = renderHook(() => useNotes('user-1', 'album-1'))
    await act(async () => {})

    act(() => result.current.onChange('typed just before navigating'))
    unmount()

    expect(setNotes).toHaveBeenCalledTimes(1)
    expect(setNotes).toHaveBeenCalledWith('user-1', 'album-1', 'typed just before navigating')
  })

  it('flushes a pending edit to the old album when the album changes', async () => {
    const { result, rerender } = renderHook(({ albumId }) => useNotes('user-1', albumId), {
      initialProps: { albumId: 'album-1' },
    })
    await act(async () => {})

    act(() => result.current.onChange('notes for album one'))
    await act(async () => {
      rerender({ albumId: 'album-2' })
    })

    expect(setNotes).toHaveBeenCalledTimes(1)
    expect(setNotes).toHaveBeenCalledWith('user-1', 'album-1', 'notes for album one')
  })

  it('retries a failed save on the next flush instead of silently dropping it', async () => {
    const { result } = renderHook(() => useNotes('user-1', 'album-1'))
    await act(async () => {})

    act(() => result.current.onChange('important thoughts'))
    setNotes.mockRejectedValueOnce(new Error('network down'))

    let ok = true
    await act(async () => {
      ok = await result.current.flush()
    })
    expect(ok).toBe(false)

    // Without the fix, the pending edit was cleared before the failed save,
    // so this flush would find nothing pending and falsely report success.
    await act(async () => {
      ok = await result.current.flush()
    })
    expect(ok).toBe(true)
    expect(setNotes).toHaveBeenCalledTimes(2)
    expect(setNotes).toHaveBeenLastCalledWith('user-1', 'album-1', 'important thoughts')
  })

  it('a newer edit wins over a restored failed save', async () => {
    const { result } = renderHook(() => useNotes('user-1', 'album-1'))
    await act(async () => {})

    act(() => result.current.onChange('first version'))
    setNotes.mockRejectedValueOnce(new Error('network down'))
    await act(async () => {
      await result.current.flush()
    })

    act(() => result.current.onChange('second version'))
    await act(async () => {
      await result.current.flush()
    })

    expect(setNotes).toHaveBeenLastCalledWith('user-1', 'album-1', 'second version')
  })

  it('does not save again when nothing is pending', async () => {
    const { result, unmount } = renderHook(() => useNotes('user-1', 'album-1'))
    await act(async () => {})

    act(() => result.current.onChange('draft'))
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(setNotes).toHaveBeenCalledTimes(1)

    unmount()
    expect(setNotes).toHaveBeenCalledTimes(1)
  })
})
