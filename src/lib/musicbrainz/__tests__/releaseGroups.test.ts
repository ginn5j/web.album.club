import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../client', () => ({
  mbFetch: vi.fn(),
}))

import { searchReleaseGroups, getReleasesByGroup } from '../releaseGroups'
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

describe('searchReleaseGroups', () => {
  it('returns an empty array when the release-groups list is empty', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ 'release-groups': [] }))
    const results = await searchReleaseGroups('nothing')
    expect(results).toEqual([])
  })

  it('maps a release group to a ReleaseGroupResult with correct fields', async () => {
    const rg = {
      id: 'rg-001',
      title: 'OK Computer',
      'artist-credit': [{ name: 'Radiohead', artist: { name: 'Radiohead' } }],
      'first-release-date': '1997-05-21',
      'primary-type': 'Album',
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ 'release-groups': [rg] }))
    const results = await searchReleaseGroups('OK Computer')

    expect(results).toHaveLength(1)
    expect(results[0].mbid).toBe('rg-001')
    expect(results[0].title).toBe('OK Computer')
    expect(results[0].artistCredit).toBe('Radiohead')
    expect(results[0].firstReleaseYear).toBe(1997)
    expect(results[0].primaryType).toBe('Album')
  })

  it('sets firstReleaseYear to undefined when first-release-date is absent', async () => {
    const rg = {
      id: 'rg-002',
      title: 'Undated',
      'artist-credit': [{ name: 'Band', artist: { name: 'Band' } }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ 'release-groups': [rg] }))
    const results = await searchReleaseGroups('Undated')
    expect(results[0].firstReleaseYear).toBeUndefined()
  })

  it('assembles artistCredit from multiple artist credits with joinphrases', async () => {
    const rg = {
      id: 'rg-003',
      title: 'Collaboration',
      'artist-credit': [
        { name: 'Artist A', artist: { name: 'Artist A' }, joinphrase: ' & ' },
        { name: 'Artist B', artist: { name: 'Artist B' }, joinphrase: '' },
      ],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ 'release-groups': [rg] }))
    const results = await searchReleaseGroups('Collaboration')
    expect(results[0].artistCredit).toBe('Artist A & Artist B')
  })

  it('falls back to "Unknown Artist" when artist-credit is absent', async () => {
    const rg = { id: 'rg-004', title: 'Mystery' }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ 'release-groups': [rg] }))
    const results = await searchReleaseGroups('Mystery')
    expect(results[0].artistCredit).toBe('Unknown Artist')
  })

  it('does not include arid in URL when artistMbid is absent', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ 'release-groups': [] }))
    await searchReleaseGroups('Abbey Road')
    const url = mockMbFetch.mock.calls[0][0] as string
    expect(url).not.toContain('arid')
  })

  it('includes arid in the query when artistMbid is provided', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ 'release-groups': [] }))
    const artistMbid = 'a74b1b7f-71a5-4011-9441-d0b5e4122711'
    await searchReleaseGroups('OK Computer', artistMbid)
    const url = mockMbFetch.mock.calls[0][0] as string
    expect(url).toContain(encodeURIComponent(`arid:${artistMbid}`))
  })

  it('handles a missing release-groups key gracefully', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({}))
    const results = await searchReleaseGroups('anything')
    expect(results).toEqual([])
  })

  it('throws when the response is not OK', async () => {
    mockMbFetch.mockResolvedValueOnce(makeErrorResponse(503))
    await expect(searchReleaseGroups('query')).rejects.toThrow('503')
  })
})

describe('getReleasesByGroup', () => {
  it('returns an empty array when the releases list is empty', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [] }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results).toEqual([])
  })

  it('maps a release with correct basic fields', async () => {
    const release = {
      id: 'rel-001',
      title: 'OK Computer',
      date: '1997-05-21',
      country: 'GB',
      media: [
        {
          format: 'CD',
          'track-count': 2,
          tracks: [
            { number: '1', title: 'Airbag', length: 294400 },
            { number: '2', title: 'Paranoid Android', length: 383880 },
          ],
        },
      ],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await getReleasesByGroup('rg-mbid')

    expect(results).toHaveLength(1)
    expect(results[0].mbid).toBe('rel-001')
    expect(results[0].title).toBe('OK Computer')
    expect(results[0].date).toBe('1997-05-21')
    expect(results[0].country).toBe('GB')
    expect(results[0].format).toBe('CD')
    expect(results[0].trackCount).toBe(2)
    expect(results[0].tracks).toHaveLength(2)
  })

  it('aggregates track count across multiple media', async () => {
    const release = {
      id: 'rel-002',
      title: 'Double Album',
      media: [
        { format: 'CD', 'track-count': 10, tracks: [] },
        { format: 'CD', 'track-count': 8, tracks: [] },
      ],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results[0].trackCount).toBe(18)
  })

  it('prefixes format with count when multiple media share the same format', async () => {
    const release = {
      id: 'rel-003',
      title: '2xCD Release',
      media: [
        { format: 'CD', 'track-count': 10, tracks: [] },
        { format: 'CD', 'track-count': 8, tracks: [] },
      ],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results[0].format).toBe('2×CD')
  })

  it('does not prefix format when there is a single medium', async () => {
    const release = {
      id: 'rel-004',
      title: 'Single Vinyl',
      media: [{ format: 'Vinyl', 'track-count': 10, tracks: [] }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results[0].format).toBe('Vinyl')
  })

  it('joins distinct formats with " + " when media have different formats', async () => {
    const release = {
      id: 'rel-005',
      title: 'CD + DVD',
      media: [
        { format: 'CD', 'track-count': 12, tracks: [] },
        { format: 'DVD', 'track-count': 1, tracks: [] },
      ],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results[0].format).toBe('CD + DVD')
  })

  it('flattens tracks across multiple media in order', async () => {
    const release = {
      id: 'rel-006',
      title: 'Double Vinyl',
      media: [
        {
          format: 'Vinyl',
          'track-count': 2,
          tracks: [
            { number: 'A1', title: 'Side A Track 1', length: 200000 },
            { number: 'A2', title: 'Side A Track 2', length: 210000 },
          ],
        },
        {
          format: 'Vinyl',
          'track-count': 2,
          tracks: [
            { number: 'B1', title: 'Side B Track 1', length: 220000 },
            { number: 'B2', title: 'Side B Track 2', length: 230000 },
          ],
        },
      ],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results[0].tracks).toHaveLength(4)
    expect(results[0].tracks[0]).toEqual({ number: 'A1', title: 'Side A Track 1', durationMs: 200000 })
    expect(results[0].tracks[2]).toEqual({ number: 'B1', title: 'Side B Track 1', durationMs: 220000 })
  })

  it('sets durationMs from track.length', async () => {
    const release = {
      id: 'rel-007',
      title: 'Timed',
      media: [{ format: 'CD', 'track-count': 1, tracks: [{ number: '1', title: 'Long Track', length: 360000 }] }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results[0].tracks[0].durationMs).toBe(360000)
  })

  it('sets durationMs to undefined when track.length is absent', async () => {
    const release = {
      id: 'rel-008',
      title: 'No Length',
      media: [{ format: 'CD', 'track-count': 1, tracks: [{ number: '1', title: 'Untimed Track' }] }],
    }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results[0].tracks[0].durationMs).toBeUndefined()
  })

  it('sets format to undefined and trackCount to 0 when media is absent', async () => {
    const release = { id: 'rel-009', title: 'No Media' }
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [release] }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results[0].format).toBeUndefined()
    expect(results[0].trackCount).toBe(0)
    expect(results[0].tracks).toEqual([])
  })

  it('includes the release-group MBID in the request URL', async () => {
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases: [] }))
    await getReleasesByGroup('my-rg-mbid')
    const url = mockMbFetch.mock.calls[0][0] as string
    expect(url).toContain('my-rg-mbid')
  })

  it('sorts releases by date ascending, empty-string undated releases last', async () => {
    const releases = [
      { id: 'newest', title: 'Newest', date: '2010-01-01', media: [] },
      { id: 'undated', title: 'Undated', date: '', media: [] },
      { id: 'oldest', title: 'Oldest', date: '1970-06-01', media: [] },
    ]
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results.map((r) => r.mbid)).toEqual(['oldest', 'newest', 'undated'])
  })

  it('sorts releases by date ascending, undefined undated releases last', async () => {
    const releases = [
      { id: 'newest', title: 'Newest', date: '2010-01-01', media: [] },
      { id: 'undated', title: 'Undated', media: [] },
      { id: 'oldest', title: 'Oldest', date: '1970-06-01', media: [] },
    ]
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results.map((r) => r.mbid)).toEqual(['oldest', 'newest', 'undated'])
  })

  it('sorts year-only dates after full dates in the same year', async () => {
    const releases = [
      { id: 'year-only', title: 'Year only', date: '1997', media: [] },
      { id: 'nov', title: 'November', date: '1997-11-04', media: [] },
      { id: 'mar', title: 'March', date: '1997-03-15', media: [] },
    ]
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results.map((r) => r.mbid)).toEqual(['mar', 'nov', 'year-only'])
  })

  it('sorts year-month dates after full dates in the same month', async () => {
    const releases = [
      { id: 'month-only', title: 'Month only', date: '1997-05', media: [] },
      { id: 'late', title: 'Late May', date: '1997-05-21', media: [] },
      { id: 'early', title: 'Early May', date: '1997-05-05', media: [] },
    ]
    mockMbFetch.mockResolvedValueOnce(makeOkResponse({ releases }))
    const results = await getReleasesByGroup('rg-mbid')
    expect(results.map((r) => r.mbid)).toEqual(['early', 'late', 'month-only'])
  })

  it('throws when the response is not OK', async () => {
    mockMbFetch.mockResolvedValueOnce(makeErrorResponse(503))
    await expect(getReleasesByGroup('rg-mbid')).rejects.toThrow('503')
  })
})
