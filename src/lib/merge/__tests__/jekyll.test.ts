import { describe, it, expect } from 'vitest'
import { generateJekyllFilename, generateJekyllPost } from '../jekyll'
import type { DiscussionData } from '../../../types/discussion'

const baseDiscussion: DiscussionData = {
  schemaVersion: 1,
  albumId: 'radiohead-ok-computer-1997',
  album: {
    title: 'OK Computer',
    artist: 'Radiohead',
    releaseYear: 1997,
    genre: 'Alternative Rock',
    mbid: 'abc-123',
    coverArtUrl: 'https://example.com/cover.jpg',
  },
  songs: [
    { position: 1, title: 'Airbag', durationMs: 274000 },
    { position: 2, title: 'Paranoid Android', durationMs: 383000 },
  ],
  pickedBy: 'alice',
  discussedAt: '2024-06-15T20:00:00Z',
  members: {
    alice: { name: 'Alice', tags: { '1': 'Starter', '2': 'Bench' }, notes: 'Great opener.' },
    bob: { name: 'Bob', tags: { '1': 'Bench' }, notes: '' },
  },
}

// ── generateJekyllFilename ───────────────────────────────────────────────────

describe('generateJekyllFilename', () => {
  it('produces the correct date-artist-title slug', () => {
    expect(generateJekyllFilename(baseDiscussion, '_posts')).toBe(
      '_posts/2024-06-15-radiohead-ok-computer.md',
    )
  })

  it('uses only the date portion (YYYY-MM-DD) of the ISO timestamp', () => {
    const d = { ...baseDiscussion, discussedAt: '2023-12-31T23:59:59Z' }
    expect(generateJekyllFilename(d, '_posts')).toContain('2023-12-31')
  })

  it('slugifies special characters in artist name', () => {
    const d = {
      ...baseDiscussion,
      album: { ...baseDiscussion.album, artist: "Guns N' Roses" },
    }
    const filename = generateJekyllFilename(d, '_posts')
    expect(filename).toContain('guns-n-roses')
  })

  it('slugifies special characters in album title', () => {
    const d = {
      ...baseDiscussion,
      album: { ...baseDiscussion.album, title: '(What\'s the Story) Morning Glory?' },
    }
    const filename = generateJekyllFilename(d, '_posts')
    expect(filename).toContain('what-s-the-story-morning-glory')
  })

  it('collapses multiple hyphens into one', () => {
    const d = {
      ...baseDiscussion,
      album: { ...baseDiscussion.album, title: 'A --- B' },
    }
    const filename = generateJekyllFilename(d, '_posts')
    // Multiple non-alphanum runs become a single hyphen
    expect(filename).not.toMatch(/--/)
  })

  it('prepends the provided postsPath', () => {
    expect(generateJekyllFilename(baseDiscussion, '_posts/rock')).toMatch(
      /^_posts\/rock\//,
    )
  })

  it('always ends with .md', () => {
    expect(generateJekyllFilename(baseDiscussion, '_posts')).toMatch(/\.md$/)
  })
})

// ── generateJekyllPost ────────────────────────────────────────────────────────

describe('generateJekyllPost', () => {
  it('includes required YAML front matter fields', () => {
    const post = generateJekyllPost(baseDiscussion)
    expect(post).toContain('layout: post')
    expect(post).toContain('title: "OK Computer"')
    expect(post).toContain('artist: "Radiohead"')
    expect(post).toContain('discussed_date: 2024-06-15')
    expect(post).toContain('members: ["Alice", "Bob"]')
    expect(post).toContain('picked_by: "Alice"')
  })

  it('includes optional front matter fields when present', () => {
    const post = generateJekyllPost(baseDiscussion)
    expect(post).toContain('release_year: 1997')
    expect(post).toContain('genre: Alternative Rock')
    expect(post).toContain('mbid: "abc-123"')
    expect(post).toContain('cover_art: "https://example.com/cover.jpg"')
  })

  it('omits optional front matter fields when absent', () => {
    const d: DiscussionData = {
      ...baseDiscussion,
      album: { title: 'Minimal', artist: 'Nobody' },
    }
    const post = generateJekyllPost(d)
    expect(post).not.toContain('release_year')
    expect(post).not.toContain('genre')
    expect(post).not.toContain('mbid')
    expect(post).not.toContain('cover_art')
  })

  it('escapes double quotes in album title', () => {
    const d: DiscussionData = {
      ...baseDiscussion,
      album: { ...baseDiscussion.album, title: 'He said "hello"' },
    }
    const post = generateJekyllPost(d)
    expect(post).toContain('title: "He said \\"hello\\""')
  })

  it('has correct song ratings table headers', () => {
    const post = generateJekyllPost(baseDiscussion)
    expect(post).toContain('| # | Song | Alice | Bob |')
  })

  it('has separator row in the table', () => {
    const post = generateJekyllPost(baseDiscussion)
    expect(post).toContain('|---|------|')
  })

  it('renders each song as a table row', () => {
    const post = generateJekyllPost(baseDiscussion)
    expect(post).toContain('| 1 | Airbag |')
    expect(post).toContain('| 2 | Paranoid Android |')
  })

  it('renders tag values in song rows', () => {
    const post = generateJekyllPost(baseDiscussion)
    // Alice tagged song 1 as Starter, Bob as Bench
    expect(post).toContain('| 1 | Airbag | Starter | Bench |')
  })

  it('renders em-dash for missing tags', () => {
    const post = generateJekyllPost(baseDiscussion)
    // Bob has no tag for song 2
    expect(post).toContain('| 2 | Paranoid Android | Bench | — |')
  })

  it('includes notes section for members with notes', () => {
    const post = generateJekyllPost(baseDiscussion)
    expect(post).toContain("## Alice's Notes")
    expect(post).toContain('Great opener.')
  })

  it('omits notes section for members with empty notes', () => {
    const post = generateJekyllPost(baseDiscussion)
    expect(post).not.toContain("## Bob's Notes")
  })

  it('omits all notes sections when no member has notes', () => {
    const d: DiscussionData = {
      ...baseDiscussion,
      members: {
        alice: { name: 'Alice', tags: {}, notes: '' },
        bob: { name: 'Bob', tags: {}, notes: '   ' },
      },
    }
    const post = generateJekyllPost(d)
    expect(post).not.toContain("## Alice's Notes")
    expect(post).not.toContain("## Bob's Notes")
  })

  it('falls back to pickedBy login when member not in members map', () => {
    const d: DiscussionData = {
      ...baseDiscussion,
      pickedBy: 'unknown-login',
    }
    const post = generateJekyllPost(d)
    expect(post).toContain('picked_by: "unknown-login"')
  })

  it('includes the discussion body heading with artist and title', () => {
    const post = generateJekyllPost(baseDiscussion)
    expect(post).toContain('## OK Computer — Radiohead (1997)')
  })

  it('wraps content with front matter delimiters', () => {
    const post = generateJekyllPost(baseDiscussion)
    expect(post.startsWith('---\n')).toBe(true)
    // Second --- ends the front matter
    const secondDash = post.indexOf('---\n', 4)
    expect(secondDash).toBeGreaterThan(4)
  })
})
