import { MUSICBRAINZ_API_BASE } from '../../constants/config'
import { mbFetch } from './client'
import type { AlbumInfo } from '../../types/album'

interface MBRelease {
  id: string
  title: string
  date?: string
  'artist-credit'?: Array<{ name?: string; artist?: { name: string } }>
  'release-group'?: { 'primary-type'?: string }
}

interface MBSearchResponse {
  releases: MBRelease[]
}

export interface SearchResult {
  mbid: string
  title: string
  artist: string
  releaseYear?: number
  album: AlbumInfo
}

export async function searchReleases(query: string): Promise<SearchResult[]> {
  const url = `${MUSICBRAINZ_API_BASE}/release?query=${encodeURIComponent(query)}&limit=10&fmt=json`
  const res = await mbFetch(url)
  if (!res.ok) throw new Error(`MusicBrainz search failed: ${res.status}`)
  const data: MBSearchResponse = await res.json()

  return (data.releases ?? []).map((r) => {
    const artistCredit = r['artist-credit']
    const artist = artistCredit?.[0]?.name ?? artistCredit?.[0]?.artist?.name ?? 'Unknown Artist'
    const releaseYear = r.date ? parseInt(r.date.slice(0, 4), 10) : undefined

    return {
      mbid: r.id,
      title: r.title,
      artist,
      releaseYear,
      album: {
        title: r.title,
        artist,
        releaseYear,
        mbid: r.id,
      },
    }
  })
}
