import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { supabase } from '../client'
import { supabaseStorage } from '../storage'
import { supabaseRealtime } from '../realtime'
import type { CurrentAlbum } from '../../../../types/album'

vi.mock('../client', () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}))

vi.mock('../storage', () => ({
  supabaseStorage: {
    getCurrentAlbum: vi.fn(),
    getRevealForAlbum: vi.fn(),
  },
}))

const getCurrentAlbum = vi.mocked(supabaseStorage.getCurrentAlbum)
const getRevealForAlbum = vi.mocked(supabaseStorage.getRevealForAlbum)

// Captures the postgres_changes handler and the subscribe status callback so
// tests can simulate table events and channel (re)connects.
interface FakeChannel {
  eventHandler: ((payload: unknown) => void) | null
  statusCb: ((status: string) => void) | null
}

let channel!: FakeChannel

function makeChannel() {
  const fake: FakeChannel & Record<string, unknown> = {
    eventHandler: null,
    statusCb: null,
    on(_type: string, _filter: unknown, fn: (payload: unknown) => void) {
      fake.eventHandler = fn
      return fake
    },
    subscribe(cb?: (status: string) => void) {
      fake.statusCb = cb ?? null
      return fake
    },
  }
  channel = fake
  return fake
}

const album: CurrentAlbum = {
  schemaVersion: 1,
  id: 'album-1',
  source: 'manual',
  selectedAt: '2026-07-02T00:00:00Z',
  selectedBy: 'Alice',
  album: { title: 'Kid A', artist: 'Radiohead' },
  songs: [],
}

beforeEach(() => {
  (supabase.channel as unknown as Mock).mockImplementation(() => makeChannel())
  getCurrentAlbum.mockResolvedValue(null)
  getRevealForAlbum.mockResolvedValue(null)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('subscribeToCurrentAlbum', () => {
  it('re-fetches the current album on every (re)subscribe so changes made while disconnected are not missed', async () => {
    getCurrentAlbum.mockResolvedValue(album)
    const cb = vi.fn()
    supabaseRealtime.subscribeToCurrentAlbum(cb)

    expect(cb).not.toHaveBeenCalled()
    channel.statusCb!('SUBSCRIBED')
    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith(album))

    // Reconnect after a network drop delivers the album picked meanwhile.
    channel.statusCb!('SUBSCRIBED')
    await vi.waitFor(() => expect(cb).toHaveBeenCalledTimes(2))
  })

  it('does not deliver null when no album is current on subscribe', async () => {
    const cb = vi.fn()
    supabaseRealtime.subscribeToCurrentAlbum(cb)

    channel.statusCb!('SUBSCRIBED')
    await vi.waitFor(() => expect(getCurrentAlbum).toHaveBeenCalled())
    expect(cb).not.toHaveBeenCalled()
  })

  it('re-fetches and delivers the album on table change events', async () => {
    getCurrentAlbum.mockResolvedValue(album)
    const cb = vi.fn()
    supabaseRealtime.subscribeToCurrentAlbum(cb)

    channel.eventHandler!({})
    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith(album))
  })
})

describe('subscribeToReveals', () => {
  it('re-checks for an existing reveal on every (re)subscribe', async () => {
    getRevealForAlbum.mockResolvedValue({ userId: 'u2', revealedAt: '2026-07-01T00:00:00Z' })
    const cb = vi.fn()
    supabaseRealtime.subscribeToReveals('album-1', cb)

    channel.statusCb!('SUBSCRIBED')
    await vi.waitFor(() =>
      expect(cb).toHaveBeenCalledWith({ userId: 'u2', revealedAt: '2026-07-01T00:00:00Z' }),
    )
  })

  it('maps insert payloads to the reveal callback', () => {
    const cb = vi.fn()
    supabaseRealtime.subscribeToReveals('album-1', cb)

    channel.eventHandler!({ new: { user_id: 'u3', revealed_at: '2026-07-01T01:00:00Z' } })
    expect(cb).toHaveBeenCalledWith({ userId: 'u3', revealedAt: '2026-07-01T01:00:00Z' })
  })
})
