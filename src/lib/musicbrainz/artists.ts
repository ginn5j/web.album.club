import { MUSICBRAINZ_API_BASE } from '../../constants/config'
import { mbFetch } from './client'

interface MBArtist {
  id: string
  name: string
  'sort-name': string
  disambiguation?: string
}

interface MBArtistSearchResponse {
  artists?: MBArtist[]
}

export interface ArtistResult {
  mbid: string
  name: string
  sortName: string
  disambiguation?: string
}

export async function searchArtists(query: string): Promise<ArtistResult[]> {
  const url =
    `${MUSICBRAINZ_API_BASE}/artist` +
    `?query=${encodeURIComponent(query)}&limit=10&fmt=json`
  const res = await mbFetch(url)
  if (!res.ok) throw new Error(`MusicBrainz artist search failed: ${res.status}`)
  const data: MBArtistSearchResponse = await res.json()

  return (data.artists ?? []).map((a) => ({
    mbid: a.id,
    name: a.name,
    sortName: a['sort-name'],
    disambiguation: a.disambiguation,
  }))
}
