import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../client', () => ({
  mbFetch: vi.fn(),
}))

import { searchArtists } from '../artists'
import { mbFetch } from '../client'

const mockMbFetch = vi.mocked(mbFetch)

function makeOkResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function makeErrorResponse(status: number): Response {
  return { ok: false, status } as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('searchArtists', () => {
  it('returns an empty array when the artists list is empty', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ artists: [] }))
    const results = await searchArtists('nobody')
    expect(results).toEqual([])
  })

  it('maps an artist to an ArtistResult with correct fields', async () => {
    const artist = {
      id: 'a74b1b7f-71a5-4011-9441-d0b5e4122711',
      name: 'Radiohead',
      'sort-name': 'Radiohead',
      disambiguation: 'UK rock band',
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ artists: [artist] }))
    const results = await searchArtists('Radiohead')

    expect(results).toHaveLength(1)
    expect(results[0].mbid).toBe('a74b1b7f-71a5-4011-9441-d0b5e4122711')
    expect(results[0].name).toBe('Radiohead')
    expect(results[0].sortName).toBe('Radiohead')
    expect(results[0].disambiguation).toBe('UK rock band')
  })

  it('sets disambiguation to undefined when absent', async () => {
    const artist = { id: 'mbid-001', name: 'The Beatles', 'sort-name': 'Beatles, The' }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ artists: [artist] }))
    const results = await searchArtists('Beatles')
    expect(results[0].disambiguation).toBeUndefined()
  })

  it('maps sort-name to sortName', async () => {
    const artist = { id: 'mbid-002', name: 'The Cure', 'sort-name': 'Cure, The' }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ artists: [artist] }))
    const results = await searchArtists('Cure')
    expect(results[0].sortName).toBe('Cure, The')
  })

  it('returns results for multiple artists', async () => {
    const artists = [
      { id: 'a', name: 'Artist A', 'sort-name': 'Artist A' },
      { id: 'b', name: 'Artist B', 'sort-name': 'Artist B' },
    ]
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ artists }))
    const results = await searchArtists('Artist')
    expect(results).toHaveLength(2)
    expect(results[0].mbid).toBe('a')
    expect(results[1].mbid).toBe('b')
  })

  it('handles a missing artists key gracefully', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({}))
    const results = await searchArtists('anything')
    expect(results).toEqual([])
  })

  it('throws when the response is not OK', async () => {
    mockMbFetch.mockResolvedValueOnce(makeErrorResponse(503))
    await expect(searchArtists('query')).rejects.toThrow('503')
  })

  it('passes the encoded query string to mbFetch', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ artists: [] }))
    await searchArtists('Sigur Rós')
    expect(mockMbFetch).toHaveBeenCalledOnce()
    const calledUrl = mockMbFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain(encodeURIComponent('Sigur Rós'))
  })
})
