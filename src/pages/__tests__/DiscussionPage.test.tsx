import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { DiscussionPage } from '../DiscussionPage'
import { backend } from '../../lib/backends'
import type { CurrentAlbum } from '../../types/album'
import type { DiscussionData } from '../../types/discussion'
import type { Member } from '../../types/member'

vi.mock('../../lib/backends', () => ({
  backend: {
    storage: {
      getTags: vi.fn(),
      setTags: vi.fn(),
      getNotes: vi.fn(),
      setNotes: vi.fn(),
      getRevealForAlbum: vi.fn(),
      createReveal: vi.fn(),
      getDiscussion: vi.fn(),
      createDiscussion: vi.fn(),
      getMembers: vi.fn(),
    },
    realtime: {
      subscribeToReveals: vi.fn(() => () => {}),
    },
  },
}))

vi.mock('../../lib/auth/AuthContext', () => ({
  useAuth: () => ({
    member: {
      id: 'm1',
      userId: 'u1',
      displayName: 'Alice',
      role: 'member',
      createdAt: '2026-01-01T00:00:00Z',
    },
  }),
}))

const storage = vi.mocked(backend.storage)

const members: Member[] = [
  { id: 'm1', userId: 'u1', displayName: 'Alice', role: 'member', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'm2', userId: 'u2', displayName: 'Bob', role: 'member', createdAt: '2026-01-02T00:00:00Z' },
]

const currentAlbum: CurrentAlbum = {
  schemaVersion: 1,
  id: 'album-1',
  source: 'manual',
  selectedAt: '2026-06-01T00:00:00Z',
  selectedBy: 'Alice',
  album: { title: 'Test Album', artist: 'Test Artist' },
  songs: [{ position: 1, title: 'Song One' }],
}

const existingDiscussion: DiscussionData = {
  schemaVersion: 1,
  albumId: 'album-1',
  album: currentAlbum.album,
  songs: currentAlbum.songs,
  pickedBy: 'Alice',
  discussedAt: '2026-06-10T00:00:00Z',
  members: {
    Alice: { name: 'Alice', tags: { '1': 'Starter' }, notes: 'existing snapshot note' },
  },
}

describe('DiscussionPage merge flow', () => {
  beforeEach(() => {
    storage.getTags.mockResolvedValue({})
    storage.getNotes.mockResolvedValue('')
    // Album already revealed, so the page goes straight to the merge path.
    storage.getRevealForAlbum.mockResolvedValue({
      userId: 'u2',
      revealedAt: '2026-06-10T00:00:00Z',
    })
    storage.getDiscussion.mockResolvedValue(null)
    storage.createDiscussion.mockResolvedValue(undefined)
    storage.getMembers.mockResolvedValue(members)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('uses an existing discussion without re-merging', async () => {
    storage.getDiscussion.mockResolvedValue(existingDiscussion)

    render(<DiscussionPage currentAlbum={currentAlbum} members={members} />)

    expect(await screen.findByText('existing snapshot note')).toBeTruthy()
    expect(storage.createDiscussion).not.toHaveBeenCalled()
    expect(storage.getMembers).not.toHaveBeenCalled()
  })

  it('merges every member\'s tags and notes and persists the snapshot when none exists', async () => {
    storage.getTags.mockImplementation(async (userId) =>
      userId === 'u1' ? { '1': 'Starter' } : { '1': 'Cut' },
    )
    storage.getNotes.mockImplementation(async (userId) =>
      userId === 'u1' ? 'great opener' : 'not for me',
    )

    render(<DiscussionPage currentAlbum={currentAlbum} members={members} />)

    await waitFor(() => expect(storage.createDiscussion).toHaveBeenCalledTimes(1))
    const merged = storage.createDiscussion.mock.calls[0][0]
    expect(merged.albumId).toBe('album-1')
    expect(merged.members.Alice).toEqual({
      name: 'Alice',
      tags: { '1': 'Starter' },
      notes: 'great opener',
    })
    expect(merged.members.Bob).toEqual({
      name: 'Bob',
      tags: { '1': 'Cut' },
      notes: 'not for me',
    })

    expect(await screen.findByText('great opener')).toBeTruthy()
    expect(screen.getByText('not for me')).toBeTruthy()
  })

  it('aborts the merge when any member fetch fails, then succeeds on retry', async () => {
    // Bob's notes fetch fails — persisting would record empty notes for him.
    storage.getNotes.mockImplementation(async (userId) => {
      if (userId === 'u2') throw new Error('network down')
      return 'great opener'
    })

    render(<DiscussionPage currentAlbum={currentAlbum} members={members} />)

    expect(await screen.findByText('Failed to merge discussion')).toBeTruthy()
    expect(storage.createDiscussion).not.toHaveBeenCalled()

    storage.getNotes.mockResolvedValue('recovered')
    fireEvent.click(screen.getByText('Retry merge'))

    await waitFor(() => expect(storage.createDiscussion).toHaveBeenCalledTimes(1))
    const merged = storage.createDiscussion.mock.calls[0][0]
    expect(merged.members.Bob.notes).toBe('recovered')
  })
})
