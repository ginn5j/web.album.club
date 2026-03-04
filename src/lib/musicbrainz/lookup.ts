import { MUSICBRAINZ_API_BASE, COVER_ART_BASE } from '../../constants/config'
import { mbFetch } from './client'
import type { AlbumInfo, Song, CurrentAlbum } from '../../types/album'

interface MBRecording {
  id: string
  title: string
  length?: number
  position?: number
}

interface MBTrack {
  position: number
  recording: MBRecording
  length?: number
  title?: string
}

interface MBMedium {
  tracks: MBTrack[]
}

interface MBRelease {
  id: string
  title: string
  date?: string
  'artist-credit'?: Array<{ name?: string; artist?: { name: string } }>
  genres?: Array<{ name: string }>
  'release-group'?: { genres?: Array<{ name: string }> }
  media?: MBMedium[]
}

export async function lookupRelease(mbid: string): Promise<{
  album: AlbumInfo
  songs: Song[]
}> {
  const url = `${MUSICBRAINZ_API_BASE}/release/${mbid}?inc=recordings+artist-credits+genres&fmt=json`
  const res = await mbFetch(url)
  if (!res.ok) throw new Error(`MusicBrainz lookup failed: ${res.status}`)
  const data: MBRelease = await res.json()

  const artistCredit = data['artist-credit']
  const artist = artistCredit?.[0]?.name ?? artistCredit?.[0]?.artist?.name ?? 'Unknown Artist'
  const releaseYear = data.date ? parseInt(data.date.slice(0, 4), 10) : undefined
  const genres = data.genres ?? data['release-group']?.genres ?? []
  const genre = genres[0]?.name

  const coverArtUrl = `${COVER_ART_BASE}/release/${mbid}/front-500`

  const album: AlbumInfo = {
    title: data.title,
    artist,
    releaseYear,
    genre,
    coverArtUrl,
    mbid,
  }

  const songs: Song[] = []
  let position = 1
  for (const medium of data.media ?? []) {
    for (const track of medium.tracks ?? []) {
      songs.push({
        position,
        title: track.title ?? track.recording.title,
        durationMs: track.length ?? track.recording.length,
        mbid: track.recording.id,
      })
      position++
    }
  }

  return { album, songs }
}

export function buildCurrentAlbum(
  album: AlbumInfo,
  songs: Song[],
  selectedBy: string,
  source: 'musicbrainz' | 'manual' = 'musicbrainz',
): CurrentAlbum {
  return {
    schemaVersion: 1,
    id: album.mbid ?? `${slugify(album.artist)}-${slugify(album.title)}`,
    source,
    selectedAt: new Date().toISOString(),
    selectedBy,
    album,
    songs,
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
