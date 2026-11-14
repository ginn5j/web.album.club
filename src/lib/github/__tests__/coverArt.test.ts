import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchCoverArt } from '../coverArt'

const SMALL = 'https://coverartarchive.org/release/abc/front-500'
const LARGE = 'https://coverartarchive.org/release/abc/front-1200'

function image(type: string, bytes: number[]): Response {
  return new Response(new Uint8Array(bytes), { status: 200, headers: { 'content-type': type } })
}

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  const fn = vi.fn((input: RequestInfo | URL) => Promise.resolve(handler(String(input))))
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('fetchCoverArt', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefers the 1200px thumbnail', async () => {
    const fetchMock = mockFetch(() => image('image/jpeg', [1, 2, 3]))

    const cover = await fetchCoverArt(SMALL)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(LARGE)
    expect(cover?.extension).toBe('jpg')
    expect(Array.from(cover?.bytes ?? [])).toEqual([1, 2, 3])
  })

  it('falls back to the stored URL when the 1200px one is missing', async () => {
    const fetchMock = mockFetch((url) =>
      url === LARGE ? new Response('', { status: 404 }) : image('image/png; charset=binary', [9]),
    )

    const cover = await fetchCoverArt(SMALL)

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([LARGE, SMALL])
    expect(cover?.extension).toBe('png')
  })

  it('fetches other URLs as-is', async () => {
    const fetchMock = mockFetch(() => image('image/webp', [1]))

    const cover = await fetchCoverArt('https://example.com/cover.webp')

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['https://example.com/cover.webp'])
    expect(cover?.extension).toBe('webp')
  })

  it('returns null for a non-image response', async () => {
    mockFetch(() => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }))
    expect(await fetchCoverArt(SMALL)).toBeNull()
  })

  it('returns null when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    expect(await fetchCoverArt(SMALL)).toBeNull()
  })
})
