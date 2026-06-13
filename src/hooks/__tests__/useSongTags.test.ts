import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSongTags } from '../useSongTags'
import { backend } from '../../lib/backends'

vi.mock('../../lib/backends', () => ({
  backend: {
    storage: {
      getTags: vi.fn(),
      setTags: vi.fn(),
    },
  },
}))

const getTags = vi.mocked(backend.storage.getTags)
const setTags = vi.mocked(backend.storage.setTags)

describe('useSongTags', () => {
  beforeEach(() => {
    getTags.mockResolvedValue({})
    setTags.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('a second tap before re-render builds on the first instead of overwriting it', async () => {
    const { result } = renderHook(() => useSongTags('user-1', 'album-1'))
    await act(async () => {})

    await act(async () => {
      void result.current.setTag(1, 'Starter')
      void result.current.setTag(2, 'Bench')
    })

    expect(setTags).toHaveBeenLastCalledWith('user-1', 'album-1', {
      '1': 'Starter',
      '2': 'Bench',
    })
    expect(result.current.tags).toEqual({ '1': 'Starter', '2': 'Bench' })
  })

  it('serializes saves so an earlier snapshot cannot reach the DB after a later one', async () => {
    const { result } = renderHook(() => useSongTags('user-1', 'album-1'))
    await act(async () => {})

    let resolveFirst!: () => void
    setTags.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveFirst = resolve }),
    )

    let first!: Promise<void>
    let second!: Promise<void>
    act(() => {
      first = result.current.setTag(1, 'Starter')
      second = result.current.setTag(2, 'Cut')
    })
    await act(async () => {})

    // The second save must wait for the first to settle.
    expect(setTags).toHaveBeenCalledTimes(1)
    expect(setTags).toHaveBeenCalledWith('user-1', 'album-1', { '1': 'Starter' })

    await act(async () => {
      resolveFirst()
      await Promise.all([first, second])
    })
    expect(setTags).toHaveBeenCalledTimes(2)
    expect(setTags).toHaveBeenLastCalledWith('user-1', 'album-1', {
      '1': 'Starter',
      '2': 'Cut',
    })
  })

  it('removes a tag when set to null', async () => {
    getTags.mockResolvedValue({ '1': 'Starter', '2': 'Bench' })
    const { result } = renderHook(() => useSongTags('user-1', 'album-1'))
    await act(async () => {})

    await act(async () => {
      await result.current.setTag(1, null)
    })

    expect(setTags).toHaveBeenLastCalledWith('user-1', 'album-1', { '2': 'Bench' })
    expect(result.current.tags).toEqual({ '2': 'Bench' })
  })

  it('surfaces a failed save as an error and clears saving when done', async () => {
    const { result } = renderHook(() => useSongTags('user-1', 'album-1'))
    await act(async () => {})

    setTags.mockRejectedValueOnce(new Error('network down'))
    await act(async () => {
      await result.current.setTag(1, 'Starter')
    })

    expect(result.current.error).toBe('network down')
    expect(result.current.saving).toBe(false)
  })
})
