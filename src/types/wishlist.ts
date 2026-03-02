import type { AlbumInfo } from './album'

export interface WishlistItem {
  id: string
  addedAt: string
  album: AlbumInfo
  source: 'musicbrainz' | 'manual'
  note?: string
}

export interface WishlistFile {
  updatedAt: string
  items: WishlistItem[]
}
