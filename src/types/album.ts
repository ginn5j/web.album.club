export interface Song {
  position: number
  title: string
  durationMs?: number
  mbid?: string
}

export interface AlbumInfo {
  title: string
  artist: string
  releaseYear?: number
  genre?: string
  coverArtUrl?: string
  mbid?: string
}

export interface CurrentAlbum {
  schemaVersion: 1
  id: string
  source: 'musicbrainz' | 'manual'
  selectedAt: string
  selectedBy: string
  album: AlbumInfo
  songs: Song[]
}
