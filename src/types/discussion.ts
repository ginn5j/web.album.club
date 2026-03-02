import type { AlbumInfo, Song } from './album'

export type TagValue = 'Starter' | 'Bench' | 'Cut'

export interface MemberDiscussionData {
  name: string
  tags: Record<string, TagValue>
  notes: string
}

export interface DiscussionData {
  schemaVersion: 1
  albumId: string
  album: AlbumInfo
  songs: Song[]
  pickedBy: string
  discussedAt: string
  members: Record<string, MemberDiscussionData>
}

export interface TagsFile {
  albumId: string
  updatedAt: string
  tags: Record<string, TagValue>
}

export interface NotesFile {
  albumId: string
  updatedAt: string
  notes: string
}

export interface RevealFile {
  albumId: string
  revealedAt: string
}
