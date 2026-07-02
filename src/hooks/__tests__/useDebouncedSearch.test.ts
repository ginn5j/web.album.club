import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedSearch } from '../useDebouncedSearch'
import { MB_DEBOUNCE_MS } from '../../constants/config'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => { resolve = res })
  return { promise, resolve }
}

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('waits for the debounce delay before searching', async () => {
    const search = vi.fn().mockResolvedValue(['result'])
    const { result } = renderHook(({ q }) => useDebouncedSearch(q, search), {
      initialProps: { q: 'kraftwerk' },
    })

    expect(search).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(MB_DEBOUNCE_MS - 1) })
    expect(search).not.toHaveBeenCalled()

    await act(async () => { vi.advanceTimersByTime(1) })
    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith('kraftwerk')
    expect(result.current.results).toEqual(['result'])
    expect(result.current.loading).toBe(false)
  })

  it('a slow response for an old query cannot overwrite a newer one', async () => {
    const slow = deferred<string[]>()
    const search = vi.fn()
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce(['newer result'])
    const { result, rerender } = renderHook(({ q }) => useDebouncedSearch(q, search), {
      initialProps: { q: 'old query' },
    })

    // Fire the first search; leave its response pending.
    await act(async () => { vi.advanceTimersByTime(MB_DEBOUNCE_MS) })
    expect(search).toHaveBeenCalledTimes(1)

    // Newer query fires and resolves first.
    rerender({ q: 'newer query' })
    await act(async () => { vi.advanceTimersByTime(MB_DEBOUNCE_MS) })
    expect(result.current.results).toEqual(['newer result'])

    // The stale response finally arrives — it must be discarded.
    await act(async () => { slow.resolve(['stale result']) })
    expect(result.current.results).toEqual(['newer result'])
  })

  it('surfaces a search failure and clears previous results', async () => {
    const search = vi.fn()
      .mockResolvedValueOnce(['first'])
      .mockRejectedValueOnce(new Error('rate limited'))
    const { result, rerender } = renderHook(({ q }) => useDebouncedSearch(q, search), {
      initialProps: { q: 'one' },
    })

    await act(async () => { vi.advanceTimersByTime(MB_DEBOUNCE_MS) })
    expect(result.current.results).toEqual(['first'])

    rerender({ q: 'two' })
    await act(async () => { vi.advanceTimersByTime(MB_DEBOUNCE_MS) })
    expect(result.current.error).toBe('rate limited')
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('clears results without searching when the query is emptied', async () => {
    const search = vi.fn().mockResolvedValue(['first'])
    const { result, rerender } = renderHook(({ q }) => useDebouncedSearch(q, search), {
      initialProps: { q: 'one' },
    })

    await act(async () => { vi.advanceTimersByTime(MB_DEBOUNCE_MS) })
    expect(result.current.results).toEqual(['first'])

    rerender({ q: '  ' })
    expect(result.current.results).toEqual([])
    await act(async () => { vi.advanceTimersByTime(MB_DEBOUNCE_MS) })
    expect(search).toHaveBeenCalledTimes(1)
  })
})
