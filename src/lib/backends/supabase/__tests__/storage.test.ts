import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { supabase } from '../client'
import { supabaseStorage } from '../storage'
import type { CurrentAlbum } from '../../../../types/album'

vi.mock('../client', () => ({
  supabase: { from: vi.fn() },
}))

// Minimal chainable stand-in for the supabase query builder: every method
// records itself and returns the builder; awaiting the builder resolves to
// the next queued result (one result per supabase.from() call).
interface QueryResult { data?: unknown; error?: unknown }
interface FromCall { table: string; ops: Array<{ method: string; args: unknown[] }> }

let fromResults: QueryResult[]
let fromCalls: FromCall[]

function makeBuilder(table: string) {
  const call: FromCall = { table, ops: [] }
  fromCalls.push(call)
  const result = fromResults.shift() ?? { data: null, error: null }
  const builder: Record<string, unknown> = {}
  for (const method of [
    'select', 'eq', 'order', 'limit', 'update', 'insert', 'upsert', 'delete',
    'maybeSingle', 'single',
  ]) {
    builder[method] = (...args: unknown[]) => {
      call.ops.push({ method, args })
      return builder
    }
  }
  builder.then = (resolve: (value: QueryResult) => void) => resolve(result)
  return builder
}

function opsOf(call: FromCall): string[] {
  return call.ops.map((o) => o.method)
}

const album: CurrentAlbum = {
  schemaVersion: 1,
  id: 'new-album-abc123',
  source: 'musicbrainz',
  selectedAt: '2026-07-02T00:00:00Z',
  selectedBy: 'Alice',
  album: { title: 'Kid A', artist: 'Radiohead' },
  songs: [{ position: 1, title: 'Everything in Its Right Place' }],
}

beforeEach(() => {
  fromResults = []
  fromCalls = []
  ;(supabase.from as unknown as Mock).mockImplementation((table: string) => makeBuilder(table))
})

describe('setCurrentAlbum', () => {
  it('deactivates (not deletes) a previous album that has a discussion', async () => {
    fromResults = [
      { data: { album_id: 'old-album' } }, // current album lookup
      { data: { album_id: 'old-album' } }, // discussion exists
      { error: null },                     // update is_current=false
      { error: null },                     // upsert new album
    ]
    await supabaseStorage.setCurrentAlbum(album)

    expect(fromCalls.map((c) => c.table)).toEqual(['albums', 'discussions', 'albums', 'albums'])
    const deactivate = fromCalls[2]
    expect(opsOf(deactivate)).toContain('update')
    expect(deactivate.ops.find((o) => o.method === 'update')?.args[0]).toEqual({ is_current: false })
    expect(fromCalls.some((c) => opsOf(c).includes('delete'))).toBe(false)
  })

  it('deletes a previous album that was never discussed', async () => {
    fromResults = [
      { data: { album_id: 'old-album' } }, // current album lookup
      { data: null },                      // no discussion
      { error: null },                     // delete
      { error: null },                     // upsert new album
    ]
    await supabaseStorage.setCurrentAlbum(album)

    const cleanup = fromCalls[2]
    expect(cleanup.table).toBe('albums')
    expect(opsOf(cleanup)).toContain('delete')
    expect(cleanup.ops.find((o) => o.method === 'eq')?.args).toEqual(['album_id', 'old-album'])
    expect(fromCalls.some((c) => opsOf(c).includes('update'))).toBe(false)
  })

  it('maps a concurrent-pick unique violation to a friendly error', async () => {
    fromResults = [
      { data: null }, // no current album
      { error: { code: '23505', message: 'duplicate key value violates "albums_one_current"' } },
    ]
    await expect(supabaseStorage.setCurrentAlbum(album)).rejects.toThrow(
      'Someone else just picked an album',
    )
  })
})

describe('upsertMember', () => {
  const row = {
    id: 'm1', user_id: 'u1', display_name: 'Alice', role: 'admin',
    created_at: '2026-01-01T00:00:00Z',
  }

  it('updates an existing row (preserving role) without inserting', async () => {
    fromResults = [{ data: row }]
    const member = await supabaseStorage.upsertMember({ userId: 'u1', displayName: 'Alice' })

    expect(member).toEqual({
      id: 'm1', userId: 'u1', displayName: 'Alice', role: 'admin',
      createdAt: '2026-01-01T00:00:00Z',
    })
    expect(fromCalls).toHaveLength(1)
    expect(opsOf(fromCalls[0])).toContain('update')
  })

  it('inserts when no row exists, without sending a role', async () => {
    fromResults = [
      { data: null }, // update matched nothing
      { data: { ...row, role: 'member' } },
    ]
    const member = await supabaseStorage.upsertMember({ userId: 'u1', displayName: 'Alice' })

    expect(member.role).toBe('member')
    const insert = fromCalls[1].ops.find((o) => o.method === 'insert')
    // The members INSERT grant is column-restricted (005_role_protection.sql):
    // sending role would be rejected, so it must come from the DB default.
    expect(insert?.args[0]).toEqual({ user_id: 'u1', display_name: 'Alice' })
  })

  it('maps a duplicate display name to a friendly error', async () => {
    fromResults = [
      { data: null },
      { error: { code: '23505', message: 'duplicate key value violates "members_display_name_unique"' } },
    ]
    await expect(
      supabaseStorage.upsertMember({ userId: 'u1', displayName: 'Alice' }),
    ).rejects.toThrow('That display name is already taken')
  })
})

describe('createReveal', () => {
  it('reads back the canonical first reveal instead of trusting the client clock', async () => {
    fromResults = [
      { error: null }, // upsert (ignoreDuplicates)
      { data: { user_id: 'u-first', revealed_at: '2026-07-01T10:00:00Z' } },
    ]
    const { revealedAt } = await supabaseStorage.createReveal('u-second', 'album-1')

    expect(revealedAt).toBe('2026-07-01T10:00:00Z')
    expect(fromCalls.map((c) => c.table)).toEqual(['reveals', 'reveals'])
  })
})
