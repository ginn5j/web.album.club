import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MB_RATE_LIMIT_MS } from '../../../constants/config'

// mbFetch keeps its queue and last-request timestamp at module level, so each
// test imports a fresh copy of the module.
async function freshMbFetch() {
  vi.resetModules()
  const mod = await import('../client')
  return mod.mbFetch
}

describe('mbFetch', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock.mockReset().mockResolvedValue({ ok: true } as Response)
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('spaces consecutive requests by at least the rate limit', async () => {
    const mbFetch = await freshMbFetch()

    void mbFetch('https://mb/one')
    void mbFetch('https://mb/two')

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(MB_RATE_LIMIT_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://mb/one', expect.anything())
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://mb/two', expect.anything())
  })

  it('continues serving requests after a failed one', async () => {
    const mbFetch = await freshMbFetch()

    fetchMock.mockRejectedValueOnce(new Error('network down'))
    const first = mbFetch('https://mb/one')
    first.catch(() => {})
    await vi.advanceTimersByTimeAsync(0)
    await expect(first).rejects.toThrow('network down')

    const second = mbFetch('https://mb/two')
    await vi.advanceTimersByTimeAsync(MB_RATE_LIMIT_MS)
    await expect(second).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('sends the JSON Accept header', async () => {
    const mbFetch = await freshMbFetch()

    void mbFetch('https://mb/one')
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledWith('https://mb/one', {
      headers: { Accept: 'application/json' },
    })
  })
})
