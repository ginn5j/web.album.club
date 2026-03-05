import { describe, it, expect } from 'vitest'
import { mergeDiscussion } from '../merger'
import type { CurrentAlbum } from '../../../types/album'
import type { TagsFile, NotesFile } from '../../../types/discussion'

const baseAlbum: CurrentAlbum = {
  schemaVersion: 1,
  id: 'radiohead-ok-computer-1997',
  source: 'musicbrainz',
  selectedAt: '2024-06-01T10:00:00Z',
  selectedBy: 'alice',
  album: {
    title: 'OK Computer',
    artist: 'Radiohead',
    releaseYear: 1997,
  },
  songs: [
    { position: 1, title: 'Airbag' },
    { position: 2, title: 'Paranoid Android' },
  ],
}

const aliceTags: TagsFile = {
  albumId: baseAlbum.id,
  updatedAt: '2024-06-15T19:00:00Z',
  tags: { '1': 'Starter', '2': 'Bench' },
}

const aliceNotes: NotesFile = {
  albumId: baseAlbum.id,
  updatedAt: '2024-06-15T19:30:00Z',
  notes: 'Absolute classic.',
}

const bobTags: TagsFile = {
  albumId: baseAlbum.id,
  updatedAt: '2024-06-15T19:05:00Z',
  tags: { '1': 'Bench', '2': 'Starter' },
}

describe('mergeDiscussion', () => {
  it('sets schemaVersion to 1', () => {
    const result = mergeDiscussion(baseAlbum, [], '2024-06-15T20:00:00Z')
    expect(result.schemaVersion).toBe(1)
  })

  it('copies albumId from currentAlbum.id', () => {
    const result = mergeDiscussion(baseAlbum, [], '2024-06-15T20:00:00Z')
    expect(result.albumId).toBe(baseAlbum.id)
  })

  it('copies the album info', () => {
    const result = mergeDiscussion(baseAlbum, [], '2024-06-15T20:00:00Z')
    expect(result.album).toEqual(baseAlbum.album)
  })

  it('copies the songs array', () => {
    const result = mergeDiscussion(baseAlbum, [], '2024-06-15T20:00:00Z')
    expect(result.songs).toEqual(baseAlbum.songs)
  })

  it('sets pickedBy from currentAlbum.selectedBy', () => {
    const result = mergeDiscussion(baseAlbum, [], '2024-06-15T20:00:00Z')
    expect(result.pickedBy).toBe('alice')
  })

  it('sets discussedAt from the provided timestamp', () => {
    const ts = '2024-06-15T20:00:00Z'
    const result = mergeDiscussion(baseAlbum, [], ts)
    expect(result.discussedAt).toBe(ts)
  })

  it('produces an empty members map when no member data is provided', () => {
    const result = mergeDiscussion(baseAlbum, [], '2024-06-15T20:00:00Z')
    expect(result.members).toEqual({})
  })

  it('keys each member by login', () => {
    const result = mergeDiscussion(
      baseAlbum,
      [{ member: { login: 'alice', name: 'Alice' }, tags: aliceTags, notes: aliceNotes }],
      '2024-06-15T20:00:00Z',
    )
    expect(Object.keys(result.members)).toContain('alice')
  })

  it('maps member name, tags, and notes correctly', () => {
    const result = mergeDiscussion(
      baseAlbum,
      [{ member: { login: 'alice', name: 'Alice' }, tags: aliceTags, notes: aliceNotes }],
      '2024-06-15T20:00:00Z',
    )
    expect(result.members['alice']).toEqual({
      name: 'Alice',
      tags: { '1': 'Starter', '2': 'Bench' },
      notes: 'Absolute classic.',
    })
  })

  it('falls back to empty tags object when tags is null', () => {
    const result = mergeDiscussion(
      baseAlbum,
      [{ member: { login: 'alice', name: 'Alice' }, tags: null, notes: aliceNotes }],
      '2024-06-15T20:00:00Z',
    )
    expect(result.members['alice'].tags).toEqual({})
  })

  it('falls back to empty string when notes is null', () => {
    const result = mergeDiscussion(
      baseAlbum,
      [{ member: { login: 'alice', name: 'Alice' }, tags: aliceTags, notes: null }],
      '2024-06-15T20:00:00Z',
    )
    expect(result.members['alice'].notes).toBe('')
  })

  it('merges data from multiple members', () => {
    const result = mergeDiscussion(
      baseAlbum,
      [
        { member: { login: 'alice', name: 'Alice' }, tags: aliceTags, notes: aliceNotes },
        { member: { login: 'bob', name: 'Bob' }, tags: bobTags, notes: null },
      ],
      '2024-06-15T20:00:00Z',
    )
    expect(Object.keys(result.members)).toHaveLength(2)
    expect(result.members['alice'].name).toBe('Alice')
    expect(result.members['bob'].name).toBe('Bob')
    expect(result.members['bob'].tags).toEqual({ '1': 'Bench', '2': 'Starter' })
  })
})
