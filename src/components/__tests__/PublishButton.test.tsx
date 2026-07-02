import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { PublishButton } from '../PublishButton'
import { backend } from '../../lib/backends'
import { commitFileToRepo } from '../../lib/github/files'
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
  commitFileToRepo: vi.fn(),
}))

const getMemberSettings = vi.mocked(backend.storage.getMemberSettings)
const commitFile = vi.mocked(commitFileToRepo)

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
      output: { owner: 'alice', repo: 'alice.github.io', postsPath: '_posts', branch: 'main' },
    })
    commitFile.mockResolvedValue(undefined)
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
    const [pat, owner, repo, branch, path, message, content] = commitFile.mock.calls[0]
    expect(pat).toBe('ghp_test')
    expect(owner).toBe('alice')
    expect(repo).toBe('alice.github.io')
    expect(branch).toBe('main')
    expect(path).toBe('_posts/2026-07-02-radiohead-kid-a.md')
    expect(message).toBe('Publish discussion: Kid A')
    expect(content).toContain('album_title: "Kid A"')
    expect(content).toContain("## Alice's Notes")

    expect(await screen.findByText(/Published to alice\/alice.github.io/)).toBeTruthy()
  })

  it('shows the publish error when the commit fails', async () => {
    commitFile.mockRejectedValue(new Error('Bad credentials'))
    render(<PublishButton discussion={discussion} />)
    await screen.findByPlaceholderText('YYYY-MM-DDTHH:MM:SSZ')

    fireEvent.click(screen.getByText('Publish to Blog'))
    expect(await screen.findByText('Bad credentials')).toBeTruthy()
  })
})
