import { MUSICBRAINZ_API_BASE } from '../../constants/config'
import { mbFetch } from './client'
import type { AlbumInfo } from '../../types/album'

interface MBRelease {
  id: string
  title: string
  date?: string
  country?: string
  disambiguation?: string
  'artist-credit'?: Array<{ name?: string; artist?: { name: string } }>
  media?: Array<{ format?: string }>
}

interface MBSearchResponse {
  releases: MBRelease[]
}

export interface SearchResult {
  mbid: string
  title: string
  artist: string
  releaseYear?: number
  format?: string
  country?: string
  disambiguation?: string
  album: AlbumInfo
}

export async function searchReleases(query: string): Promise<SearchResult[]> {
  const url =
    `${MUSICBRAINZ_API_BASE}/release` +
    `?query=${encodeURIComponent(query)}&type=album&limit=10&fmt=json`
  const res = await mbFetch(url)
  if (!res.ok) throw new Error(`MusicBrainz search failed: ${res.status}`)
  const data: MBSearchResponse = await res.json()

  return (data.releases ?? [])
    .map((r) => {
      const artistCredit = r['artist-credit']
      const artist = artistCredit?.[0]?.name ?? artistCredit?.[0]?.artist?.name ?? 'Unknown Artist'
      const releaseYear = r.date ? parseInt(r.date.slice(0, 4), 10) : undefined
      const format = r.media?.[0]?.format

      return {
        mbid: r.id,
        title: r.title,
        artist,
        releaseYear,
        format,
        country: r.country,
        disambiguation: r.disambiguation,
        album: {
          title: r.title,
          artist,
          releaseYear,
          mbid: r.id,
        },
      }
    })
    .sort((a, b) => {
      if (a.releaseYear === undefined && b.releaseYear === undefined) return 0
      if (a.releaseYear === undefined) return 1
      if (b.releaseYear === undefined) return -1
      return a.releaseYear - b.releaseYear
    })
}
