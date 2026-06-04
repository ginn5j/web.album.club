import { MUSICBRAINZ_API_BASE } from '../../constants/config'
import { mbFetch } from './client'

interface MBArtistCredit {
  name?: string
  artist?: { name: string }
  joinphrase?: string
}

interface MBReleaseGroup {
  id: string
  title: string
  'artist-credit'?: MBArtistCredit[]
  'first-release-date'?: string
  'primary-type'?: string
}

interface MBReleaseGroupSearchResponse {
  'release-groups'?: MBReleaseGroup[]
}

interface MBTrack {
  number: string
  title: string
  length?: number | null
}

interface MBMedium {
  format?: string
  'track-count'?: number
  tracks?: MBTrack[]
}

interface MBRelease {
  id: string
  title: string
  date?: string
  country?: string
  media?: MBMedium[]
}

interface MBReleaseListResponse {
  releases?: MBRelease[]
}

export interface ReleaseGroupResult {
  mbid: string
  title: string
  artistCredit: string
  firstReleaseYear?: number
  primaryType?: string
}

export interface TrackInRelease {
  number: string
  title: string
  durationMs?: number
}

export interface ReleaseInGroup {
  mbid: string
  title: string
  date?: string
  country?: string
  format?: string
  trackCount: number
  tracks: TrackInRelease[]
}

export async function searchReleaseGroups(
  query: string,
  artistMbid?: string,
): Promise<ReleaseGroupResult[]> {
  const luceneQuery = artistMbid ? `${query} AND arid:${artistMbid}` : query
  const url =
    `${MUSICBRAINZ_API_BASE}/release-group` +
    `?query=${encodeURIComponent(luceneQuery)}&limit=10&fmt=json`
  const res = await mbFetch(url)
  if (!res.ok) throw new Error(`MusicBrainz release group search failed: ${res.status}`)
  const data: MBReleaseGroupSearchResponse = await res.json()

  return (data['release-groups'] ?? []).map((rg) => {
    const credits = rg['artist-credit'] ?? []
    const artistCredit =
      credits.map((c) => (c.name ?? c.artist?.name ?? '') + (c.joinphrase ?? '')).join('') ||
      'Unknown Artist'
    const firstReleaseYear = rg['first-release-date']
      ? parseInt(rg['first-release-date'].slice(0, 4), 10)
      : undefined

    return {
      mbid: rg.id,
      title: rg.title,
      artistCredit,
      firstReleaseYear,
      primaryType: rg['primary-type'],
    }
  })
}

export async function getReleasesByGroup(releaseGroupMbid: string): Promise<ReleaseInGroup[]> {
  const url =
    `${MUSICBRAINZ_API_BASE}/release` +
    `?release-group=${releaseGroupMbid}&inc=recordings&limit=100&fmt=json`
  const res = await mbFetch(url)
  if (!res.ok) throw new Error(`MusicBrainz release list failed: ${res.status}`)
  const data: MBReleaseListResponse = await res.json()

  return (data.releases ?? [])
    .map((r) => {
    const media = r.media ?? []

    const formatGroups: Record<string, number> = {}
    for (const m of media) {
      const fmt = m.format ?? 'Unknown'
      formatGroups[fmt] = (formatGroups[fmt] ?? 0) + 1
    }
    const formatParts = Object.entries(formatGroups).map(([fmt, count]) =>
      count > 1 ? `${count}×${fmt}` : fmt,
    )
    const format = formatParts.length > 0 ? formatParts.join(' + ') : undefined

    const trackCount = media.reduce((sum, m) => sum + (m['track-count'] ?? 0), 0)

    const tracks: TrackInRelease[] = []
    for (const m of media) {
      for (const t of m.tracks ?? []) {
        tracks.push({
          number: t.number,
          title: t.title,
          durationMs: t.length ?? undefined,
        })
      }
    }

    return {
      mbid: r.id,
      title: r.title,
      date: r.date,
      country: r.country,
      format,
      trackCount,
      tracks,
    }
  })
    .sort((a, b) => {
      if (a.date === undefined && b.date === undefined) return 0
      if (a.date === undefined) return 1
      if (b.date === undefined) return -1
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    })
}
