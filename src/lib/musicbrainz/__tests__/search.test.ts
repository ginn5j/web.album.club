import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the rate-limited mbFetch client so tests run instantly without network
vi.mock('../client', () => ({
  mbFetch: vi.fn(),
}))

import { searchReleases } from '../search'
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

describe('searchReleases', () => {
  it('returns an empty array when the releases list is empty', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [] }))
    const results = await searchReleases('nothing')
    expect(results).toEqual([])
  })

  it('maps a release to a SearchResult with correct fields', async () => {
    const release = {
      id: 'mb-id-001',
      title: 'OK Computer',
      date: '1997-05-21',
      country: 'GB',
      'artist-credit': [{ name: 'Radiohead', artist: { name: 'Radiohead' } }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await searchReleases('OK Computer')

    expect(results).toHaveLength(1)
    expect(results[0].mbid).toBe('mb-id-001')
    expect(results[0].title).toBe('OK Computer')
    expect(results[0].artist).toBe('Radiohead')
    expect(results[0].releaseYear).toBe(1997)
    expect(results[0].country).toBe('GB')
  })

  it('embeds a matching AlbumInfo in the album field', async () => {
    const release = {
      id: 'mb-id-002',
      title: 'Homogenic',
      date: '1997',
      'artist-credit': [{ name: 'Björk', artist: { name: 'Björk' } }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await searchReleases('Homogenic')

    expect(results[0].album).toMatchObject({
      title: 'Homogenic',
      artist: 'Björk',
      mbid: 'mb-id-002',
    })
  })

  it('prefers artist-credit[0].name over artist.name', async () => {
    // The join name (credit.name) differs from the canonical artist name
    const release = {
      id: 'mb-id-003',
      title: 'Some Album',
      'artist-credit': [{ name: 'Jay-Z', artist: { name: 'JAY-Z' } }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await searchReleases('Some Album')
    expect(results[0].artist).toBe('Jay-Z')
  })

  it('falls back to artist.name when credit.name is absent', async () => {
    const release = {
      id: 'mb-id-004',
      title: 'Other Album',
      'artist-credit': [{ artist: { name: 'Canonical Name' } }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await searchReleases('Other Album')
    expect(results[0].artist).toBe('Canonical Name')
  })

  it('falls back to "Unknown Artist" when artist-credit is absent', async () => {
    const release = { id: 'mb-id-005', title: 'Mystery Album' }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await searchReleases('Mystery Album')
    expect(results[0].artist).toBe('Unknown Artist')
  })

  it('parses releaseYear from a full date string', async () => {
    const release = {
      id: 'mb-id-006',
      title: 'Dated',
      date: '2007-06-18',
      'artist-credit': [{ name: 'Band', artist: { name: 'Band' } }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await searchReleases('Dated')
    expect(results[0].releaseYear).toBe(2007)
  })

  it('parses releaseYear from a year-only date string', async () => {
    const release = {
      id: 'mb-id-007',
      title: 'Year Only',
      date: '1999',
      'artist-credit': [{ name: 'Band', artist: { name: 'Band' } }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await searchReleases('Year Only')
    expect(results[0].releaseYear).toBe(1999)
  })

  it('sets releaseYear to undefined when date is absent', async () => {
    const release = {
      id: 'mb-id-008',
      title: 'Undated',
      'artist-credit': [{ name: 'Band', artist: { name: 'Band' } }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await searchReleases('Undated')
    expect(results[0].releaseYear).toBeUndefined()
  })

  it('returns results for multiple releases', async () => {
    const releases = [
      { id: 'a', title: 'Album A', 'artist-credit': [{ name: 'Artist A', artist: { name: 'Artist A' } }] },
      { id: 'b', title: 'Album B', 'artist-credit': [{ name: 'Artist B', artist: { name: 'Artist B' } }] },
    ]
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases }))
    const results = await searchReleases('Album')
    expect(results).toHaveLength(2)
    expect(results[0].mbid).toBe('a')
    expect(results[1].mbid).toBe('b')
  })

  it('extracts format from media[0].format', async () => {
    const release = {
      id: 'mb-id-009',
      title: 'Vinyl Album',
      'artist-credit': [{ name: 'Band', artist: { name: 'Band' } }],
      media: [{ format: 'Vinyl' }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await searchReleases('Vinyl Album')
    expect(results[0].format).toBe('Vinyl')
  })

  it('sets format to undefined when media is absent', async () => {
    const release = {
      id: 'mb-id-010',
      title: 'No Media',
      'artist-credit': [{ name: 'Band', artist: { name: 'Band' } }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await searchReleases('No Media')
    expect(results[0].format).toBeUndefined()
  })

  it('sorts results by release year ascending, undated releases last', async () => {
    const releases = [
      { id: 'c', title: 'Newest', date: '2010', 'artist-credit': [{ name: 'A', artist: { name: 'A' } }] },
      { id: 'd', title: 'Undated', 'artist-credit': [{ name: 'A', artist: { name: 'A' } }] },
      { id: 'e', title: 'Oldest', date: '1970', 'artist-credit': [{ name: 'A', artist: { name: 'A' } }] },
    ]
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases }))
    const results = await searchReleases('A')
    expect(results.map((r) => r.mbid)).toEqual(['e', 'c', 'd'])
  })

  it('throws when the response is not OK', async () => {
    mockMbFetch.mockResolvedValueOnce(makeErrorResponse(503))
    await expect(searchReleases('query')).rejects.toThrow('503')
  })

  it('passes the encoded query string to mbFetch', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [] }))
    await searchReleases('Sigur Rós')
    expect(mockMbFetch).toHaveBeenCalledOnce()
    const calledUrl = mockMbFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain(encodeURIComponent('Sigur Rós'))
  })
})
