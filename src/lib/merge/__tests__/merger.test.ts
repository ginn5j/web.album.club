import { describe, it, expect } from 'vitest'
import { mergeDiscussion } from '../merger'
import type { CurrentAlbum } from '../../../types/album'
import type { TagValue } from '../../../types/discussion'
import type { Member } from '../../../types/member'

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

const aliceMember: Member = {
  id: 'row-1',
  userId: 'uid-alice',
  displayName: 'Alice',
  role: 'member',
  createdAt: '2024-01-01T00:00:00Z',
}

const bobMember: Member = {
  id: 'row-2',
  userId: 'uid-bob',
  displayName: 'Bob',
  role: 'member',
  createdAt: '2024-01-02T00:00:00Z',
}

const aliceTags: Record<string, TagValue> = { '1': 'Starter', '2': 'Bench' }
const aliceNotes = 'Absolute classic.'
const bobTags: Record<string, TagValue> = { '1': 'Bench', '2': 'Starter' }

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

  it('keys each member by displayName', () => {
    const result = mergeDiscussion(
      baseAlbum,
      [{ member: aliceMember, tags: aliceTags, notes: aliceNotes }],
      '2024-06-15T20:00:00Z',
    )
    expect(Object.keys(result.members)).toContain('Alice')
  })

  it('maps member name, tags, and notes correctly', () => {
    const result = mergeDiscussion(
      baseAlbum,
      [{ member: aliceMember, tags: aliceTags, notes: aliceNotes }],
      '2024-06-15T20:00:00Z',
    )
    expect(result.members['Alice']).toEqual({
      name: 'Alice',
      tags: { '1': 'Starter', '2': 'Bench' },
      notes: 'Absolute classic.',
    })
  })

  it('falls back to empty tags object when tags is null', () => {
    const result = mergeDiscussion(
      baseAlbum,
      [{ member: aliceMember, tags: null, notes: aliceNotes }],
      '2024-06-15T20:00:00Z',
    )
    expect(result.members['Alice'].tags).toEqual({})
  })

  it('falls back to empty string when notes is null', () => {
    const result = mergeDiscussion(
      baseAlbum,
      [{ member: aliceMember, tags: aliceTags, notes: null }],
      '2024-06-15T20:00:00Z',
    )
    expect(result.members['Alice'].notes).toBe('')
  })

  it('merges data from multiple members', () => {
    const result = mergeDiscussion(
      baseAlbum,
      [
        { member: aliceMember, tags: aliceTags, notes: aliceNotes },
        { member: bobMember, tags: bobTags, notes: null },
      ],
      '2024-06-15T20:00:00Z',
    )
    expect(Object.keys(result.members)).toHaveLength(2)
    expect(result.members['Alice'].name).toBe('Alice')
    expect(result.members['Bob'].name).toBe('Bob')
    expect(result.members['Bob'].tags).toEqual({ '1': 'Bench', '2': 'Starter' })
  })

  it('last writer wins when two members share the same displayName', () => {
    const alice2: Member = { id: 'row-3', userId: 'uid-alice2', displayName: 'Alice', role: 'member', createdAt: '2024-01-03T00:00:00Z' }
    const result = mergeDiscussion(
      baseAlbum,
      [
        { member: aliceMember, tags: aliceTags, notes: 'first' },
        { member: alice2,      tags: { '1': 'Cut' }, notes: 'second' },
      ],
      '2024-06-15T20:00:00Z',
    )
    expect(Object.keys(result.members)).toHaveLength(1)
    expect(result.members['Alice'].notes).toBe('second')
    expect(result.members['Alice'].tags).toEqual({ '1': 'Cut' })
  })
})
