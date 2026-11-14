import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { PublishButton } from '../PublishButton'
import { backend } from '../../lib/backends'
import { commitFiles } from '../../lib/github/files'
import { fetchCoverArt } from '../../lib/github/coverArt'
import type { DiscussionData } from '../../types/discussion'

vi.mock('../../lib/backends', () => ({
  backend: {
    storage: {
      getMemberSettings: vi.fn(),
    },
  },
}))

vi.mock('../../lib/auth/useAuth', () => ({
  useAuth: () => ({
    member: {
      id: 'm1', userId: 'u1', displayName: 'Alice', role: 'member',
      createdAt: '2026-01-01T00:00:00Z',
    },
  }),
}))

vi.mock('../../lib/github/files', () => ({
  commitFiles: vi.fn(),
}))

vi.mock('../../lib/github/coverArt', () => ({
  fetchCoverArt: vi.fn(),
}))

const getMemberSettings = vi.mocked(backend.storage.getMemberSettings)
const commitFile = vi.mocked(commitFiles)
const fetchCover = vi.mocked(fetchCoverArt)

const discussion: DiscussionData = {
  schemaVersion: 1,
  albumId: 'album-1',
  album: { title: 'Kid A', artist: 'Radiohead' },
  songs: [{ position: 1, title: 'Everything in Its Right Place' }],
  pickedBy: 'Alice',
  discussedAt: '2026-06-01T12:00:00Z',
  members: { Alice: { name: 'Alice', tags: { '1': 'Starter' }, notes: 'brilliant' } },
}

describe('PublishButton', () => {
  beforeEach(() => {
    getMemberSettings.mockResolvedValue({
      publishPat: 'ghp_test',
      output: {
        owner: 'alice', repo: 'alice.github.io', postsPath: '_posts',
        assetsPath: 'assets/{{year}}/album-club', branch: 'main',
      },
    })
    commitFile.mockResolvedValue('oid')
    fetchCover.mockResolvedValue(null)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('prompts for configuration when no publish settings exist', async () => {
    getMemberSettings.mockResolvedValue(null)
    render(<PublishButton discussion={discussion} />)
    expect(await screen.findByText(/Configure your output repo and publish PAT/)).toBeTruthy()
  })

  it('blocks publishing when the date is not a full ISO timestamp', async () => {
    render(<PublishButton discussion={discussion} />)
    const input = await screen.findByPlaceholderText('YYYY-MM-DDTHH:MM:SSZ')

    fireEvent.change(input, { target: { value: '2026-07-02' } })
    fireEvent.click(screen.getByText('Publish to Blog'))

    expect(await screen.findByText(/Publish date must be an ISO timestamp/)).toBeTruthy()
    expect(commitFile).not.toHaveBeenCalled()
  })

  it('publishes the generated post to the configured repo', async () => {
    render(<PublishButton discussion={discussion} />)
    const input = await screen.findByPlaceholderText('YYYY-MM-DDTHH:MM:SSZ')

    fireEvent.change(input, { target: { value: '2026-07-02T09:00:00Z' } })
    fireEvent.click(screen.getByText('Publish to Blog'))

    await waitFor(() => expect(commitFile).toHaveBeenCalledTimes(1))
    const [pat, owner, repo, branch, message, files] = commitFile.mock.calls[0]
    expect(pat).toBe('ghp_test')
    expect(owner).toBe('alice')
    expect(repo).toBe('alice.github.io')
    expect(branch).toBe('main')
    expect(message).toBe('Publish discussion: Kid A')
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('_posts/2026-07-02-radiohead-kid-a.md')
    expect(files[0].content).toContain('album_title: "Kid A"')
    expect(files[0].content).toContain("## Alice's Notes")
    // No cover on this album, so nothing to download.
    expect(fetchCover).not.toHaveBeenCalled()

    expect(await screen.findByText(/Published to alice\/alice.github.io/)).toBeTruthy()
  })

  describe('cover art capture', () => {
    const REMOTE = 'https://coverartarchive.org/release/abc/front-500'
    const withCover: DiscussionData = {
      ...discussion,
      album: { ...discussion.album, coverArtUrl: REMOTE },
    }

    async function publish(d: DiscussionData) {
      render(<PublishButton discussion={d} />)
      const input = await screen.findByPlaceholderText('YYYY-MM-DDTHH:MM:SSZ')
      fireEvent.change(input, { target: { value: '2026-07-02T09:00:00Z' } })
      fireEvent.click(screen.getByText('Publish to Blog'))
      await waitFor(() => expect(commitFile).toHaveBeenCalledTimes(1))
      return commitFile.mock.calls[0][5]
    }

    it('commits the cover with the post and points the post at the saved copy', async () => {
      const bytes = new Uint8Array([0xff, 0xd8, 0xff])
      fetchCover.mockResolvedValue({ bytes, extension: 'jpg' })

      const files = await publish(withCover)

      expect(fetchCover).toHaveBeenCalledWith(REMOTE)
      expect(files).toHaveLength(2)
      expect(files[0].path).toBe('_posts/2026-07-02-radiohead-kid-a.md')
      expect(files[1]).toEqual({
        path: 'assets/2026/album-club/2026-07-02-radiohead-kid-a.jpg',
        content: bytes,
      })
      const local = '/assets/2026/album-club/2026-07-02-radiohead-kid-a.jpg'
      expect(files[0].content).toContain(`cover_art: "${local}"`)
      expect(files[0].content).toContain(`  teaser: "${local}"`)
      expect(files[0].content).toContain(`  image: "${local}"`)
      expect(files[0].content).not.toContain(REMOTE)
    })

    it('keeps the remote URL and says so when the cover cannot be downloaded', async () => {
      fetchCover.mockResolvedValue(null)

      const files = await publish(withCover)

      expect(files).toHaveLength(1)
      expect(files[0].content).toContain(`  image: "${REMOTE}"`)
      expect(await screen.findByText(/Cover art could not be downloaded/)).toBeTruthy()
    })

    it('does not download the cover when the cover art path is blank', async () => {
      getMemberSettings.mockResolvedValue({
        publishPat: 'ghp_test',
        output: {
          owner: 'alice', repo: 'alice.github.io', postsPath: '_posts',
          assetsPath: '', branch: 'main',
        },
      })

      const files = await publish(withCover)

      expect(fetchCover).not.toHaveBeenCalled()
      expect(files).toHaveLength(1)
      expect(files[0].content).toContain(`  image: "${REMOTE}"`)
      expect(screen.queryByText(/Cover art could not be downloaded/)).toBeNull()
    })
  })

  it('shows the publish error when the commit fails', async () => {
    commitFile.mockRejectedValue(new Error('Bad credentials'))
    render(<PublishButton discussion={discussion} />)
    await screen.findByPlaceholderText('YYYY-MM-DDTHH:MM:SSZ')

    fireEvent.click(screen.getByText('Publish to Blog'))
    expect(await screen.findByText('Bad credentials')).toBeTruthy()
  })
})
