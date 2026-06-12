import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the rate-limited mbFetch client so tests run instantly without network
vi.mock('../client', () => ({
  mbFetch: vi.fn(),
}))

import { lookupRelease, buildCurrentAlbum } from '../lookup'
import { mbFetch } from '../client'
import { COVER_ART_BASE } from '../../../constants/config'
import type { AlbumInfo, Song } from '../../../types/album'

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

const MBID = 'test-mbid-0001'

function makeRelease(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: MBID,
    title: 'Test Album',
    date: '1997-05-21',
    'artist-credit': [{ name: 'Test Artist', artist: { name: 'Test Artist Canonical' } }],
    genres: [{ name: 'Rock' }],
    'release-group': { genres: [{ name: 'Alternative' }] },
    media: [
      {
        tracks: [
          { position: 1, title: 'Track One', length: 240000, recording: { id: 'rec-1', title: 'Track One Recording', length: 240000 } },
          { position: 2, title: 'Track Two', length: 180000, recording: { id: 'rec-2', title: 'Track Two Recording', length: 180000 } },
        ],
      },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('lookupRelease', () => {
  describe('artist-credit parsing', () => {
    it('maps artist from artist-credit[0].name', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({
        'artist-credit': [{ name: 'Jay-Z', artist: { name: 'JAY-Z' } }],
      })))
      const { album } = await lookupRelease(MBID)
      expect(album.artist).toBe('Jay-Z')
    })

    it('falls back to artist-credit[0].artist.name when .name is absent', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({
        'artist-credit': [{ artist: { name: 'Canonical Name' } }],
      })))
      const { album } = await lookupRelease(MBID)
      expect(album.artist).toBe('Canonical Name')
    })

    it('falls back to "Unknown Artist" when artist-credit is absent', async () => {
      const release = makeRelease()
      delete release['artist-credit']
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(release))
      const { album } = await lookupRelease(MBID)
      expect(album.artist).toBe('Unknown Artist')
    })
  })

  describe('releaseYear parsing', () => {
    it('parses releaseYear from a full date string', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({ date: '1997-05-21' })))
      const { album } = await lookupRelease(MBID)
      expect(album.releaseYear).toBe(1997)
    })

    it('parses releaseYear from a year-only string', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({ date: '1997' })))
      const { album } = await lookupRelease(MBID)
      expect(album.releaseYear).toBe(1997)
    })

    it('leaves releaseYear undefined when date is absent', async () => {
      const release = makeRelease()
      delete release['date']
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(release))
      const { album } = await lookupRelease(MBID)
      expect(album.releaseYear).toBeUndefined()
    })
  })

  describe('genre parsing', () => {
    it('uses genres[0].name for genre (release-level)', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({
        genres: [{ name: 'Electronic' }],
        'release-group': { genres: [{ name: 'Pop' }] },
      })))
      const { album } = await lookupRelease(MBID)
      expect(album.genre).toBe('Electronic')
    })

    it('falls back to release-group.genres[0].name when release genres absent', async () => {
      const release = makeRelease({ 'release-group': { genres: [{ name: 'Jazz' }] } })
      delete release['genres']
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(release))
      const { album } = await lookupRelease(MBID)
      expect(album.genre).toBe('Jazz')
    })

    it('leaves genre undefined when neither genre list is present', async () => {
      const release = makeRelease({ 'release-group': {} })
      delete release['genres']
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(release))
      const { album } = await lookupRelease(MBID)
      expect(album.genre).toBeUndefined()
    })
  })

  describe('cover art', () => {
    it('sets coverArtUrl using COVER_ART_BASE', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease()))
      const { album } = await lookupRelease(MBID)
      expect(album.coverArtUrl).toBe(`${COVER_ART_BASE}/release/${MBID}/front-500`)
    })
  })

  describe('track / song parsing', () => {
    it('flattens tracks across two media into a single array with sequential positions starting at 1', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({
        media: [
          {
            tracks: [
              { position: 1, title: 'Side A Track 1', length: 200000, recording: { id: 'r1', title: 'R1', length: 200000 } },
              { position: 2, title: 'Side A Track 2', length: 210000, recording: { id: 'r2', title: 'R2', length: 210000 } },
            ],
          },
          {
            tracks: [
              { position: 1, title: 'Side B Track 1', length: 220000, recording: { id: 'r3', title: 'R3', length: 220000 } },
            ],
          },
        ],
      })))
      const { songs } = await lookupRelease(MBID)
      expect(songs).toHaveLength(3)
      expect(songs[0].position).toBe(1)
      expect(songs[1].position).toBe(2)
      expect(songs[2].position).toBe(3)
    })

    it('uses track.title when present', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({
        media: [{
          tracks: [
            { position: 1, title: 'Track Title', length: 180000, recording: { id: 'r1', title: 'Recording Title', length: 180000 } },
          ],
        }],
      })))
      const { songs } = await lookupRelease(MBID)
      expect(songs[0].title).toBe('Track Title')
    })

    it('falls back to track.recording.title when track.title is absent', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({
        media: [{
          tracks: [
            { position: 1, length: 180000, recording: { id: 'r1', title: 'Recording Title', length: 180000 } },
          ],
        }],
      })))
      const { songs } = await lookupRelease(MBID)
      expect(songs[0].title).toBe('Recording Title')
    })

    it('uses track.length as durationMs', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({
        media: [{
          tracks: [
            { position: 1, title: 'T', length: 123456, recording: { id: 'r1', title: 'T', length: 999999 } },
          ],
        }],
      })))
      const { songs } = await lookupRelease(MBID)
      expect(songs[0].durationMs).toBe(123456)
    })

    it('falls back to track.recording.length when track.length is absent', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({
        media: [{
          tracks: [
            { position: 1, title: 'T', recording: { id: 'r1', title: 'T', length: 654321 } },
          ],
        }],
      })))
      const { songs } = await lookupRelease(MBID)
      expect(songs[0].durationMs).toBe(654321)
    })

    it('omits durationMs when both track.length and recording.length are absent', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({
        media: [{
          tracks: [
            { position: 1, title: 'T', recording: { id: 'r1', title: 'T' } },
          ],
        }],
      })))
      const { songs } = await lookupRelease(MBID)
      expect(songs[0].durationMs).toBeUndefined()
    })

    it('sets mbid from track.recording.id', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease({
        media: [{
          tracks: [
            { position: 1, title: 'T', length: 180000, recording: { id: 'recording-mbid-abc', title: 'T', length: 180000 } },
          ],
        }],
      })))
      const { songs } = await lookupRelease(MBID)
      expect(songs[0].mbid).toBe('recording-mbid-abc')
    })
  })

  describe('error handling', () => {
    it('throws on a non-OK HTTP response', async () => {
      mockMbFetch.mockResolvedValueOnce(makeErrorResponse(404))
      await expect(lookupRelease(MBID)).rejects.toThrow('404')
    })
  })

  describe('URL construction', () => {
    it('calls mbFetch with a URL containing the correct query parameters', async () => {
      mockMbFetch.mockResolvedValueOnce(makeOkResponse(makeRelease()))
      await lookupRelease(MBID)
      expect(mockMbFetch).toHaveBeenCalledOnce()
      const calledUrl = mockMbFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('inc=recordings+artist-credits+genres&fmt=json')
    })
  })
})

describe('buildCurrentAlbum', () => {
  const baseAlbum: AlbumInfo = {
    title: 'OK Computer',
    artist: 'Radiohead',
    mbid: 'radiohead-ok-computer-mbid',
    releaseYear: 1997,
  }
  const songs: Song[] = [
    { position: 1, title: 'Airbag', mbid: 'song-mbid-1' },
  ]

  it('sets schemaVersion: 1', () => {
    const result = buildCurrentAlbum(baseAlbum, songs, 'alice')
    expect(result.schemaVersion).toBe(1)
  })

  it('copies album and songs references', () => {
    const result = buildCurrentAlbum(baseAlbum, songs, 'alice')
    expect(result.album).toBe(baseAlbum)
    expect(result.songs).toBe(songs)
  })

  it('sets selectedBy from argument', () => {
    const result = buildCurrentAlbum(baseAlbum, songs, 'bob')
    expect(result.selectedBy).toBe('bob')
  })

  it('defaults source to "musicbrainz" when omitted', () => {
    const result = buildCurrentAlbum(baseAlbum, songs, 'alice')
    expect(result.source).toBe('musicbrainz')
  })

  it('uses "manual" source when explicitly passed', () => {
    const result = buildCurrentAlbum(baseAlbum, songs, 'alice', 'manual')
    expect(result.source).toBe('manual')
  })

  it('bases the id on album.mbid when present', () => {
    const result = buildCurrentAlbum(baseAlbum, songs, 'alice')
    expect(result.id).toMatch(/^radiohead-ok-computer-mbid-[0-9a-f-]{8}$/)
  })

  it('slugifies artist + title as fallback id base when mbid is absent', () => {
    const albumNoMbid: AlbumInfo = { title: 'OK Computer', artist: 'Radiohead' }
    const result = buildCurrentAlbum(albumNoMbid, songs, 'alice')
    expect(result.id).toMatch(/^radiohead-ok-computer-[0-9a-f-]{8}$/)
  })

  it('generates a distinct id each time the same album is picked', () => {
    const first = buildCurrentAlbum(baseAlbum, songs, 'alice')
    const second = buildCurrentAlbum(baseAlbum, songs, 'alice')
    expect(first.id).not.toBe(second.id)
  })

  it('selectedAt is a valid ISO date string', () => {
    const result = buildCurrentAlbum(baseAlbum, songs, 'alice')
    expect(result.selectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(() => new Date(result.selectedAt)).not.toThrow()
    expect(new Date(result.selectedAt).toISOString()).toBe(result.selectedAt)
  })
})
