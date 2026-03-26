import { describe, it, expect } from 'vitest'
import { generateJekyllFilename, generateJekyllPost, DEFAULT_TEMPLATE } from '../jekyll'
import type { DiscussionData } from '../../../types/discussion'

const PUBLISH_DATE = '2024-06-15T20:00:00Z'

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
  it('produces the correct year/month/date-artist-title slug', () => {
    expect(generateJekyllFilename(baseDiscussion, '_posts', PUBLISH_DATE)).toBe(
      '_posts/2024/06/2024-06-15-radiohead-ok-computer.md',
    )
  })

  it('uses only the date portion (YYYY-MM-DD) of the publish date', () => {
    const d = { ...baseDiscussion }
    expect(generateJekyllFilename(d, '_posts', '2023-12-31T23:59:59Z')).toContain('2023-12-31')
  })

  it('places files under year/month subdirectories', () => {
    expect(generateJekyllFilename(baseDiscussion, '_posts', '2023-12-31T23:59:59Z')).toMatch(
      /^_posts\/2023\/12\//,
    )
  })

  it('slugifies special characters in artist name', () => {
    const d = {
      ...baseDiscussion,
      album: { ...baseDiscussion.album, artist: "Guns N' Roses" },
    }
    const filename = generateJekyllFilename(d, '_posts', PUBLISH_DATE)
    expect(filename).toContain('guns-n-roses')
  })

  it('slugifies special characters in album title', () => {
    const d = {
      ...baseDiscussion,
      album: { ...baseDiscussion.album, title: "(What's the Story) Morning Glory?" },
    }
    const filename = generateJekyllFilename(d, '_posts', PUBLISH_DATE)
    expect(filename).toContain('what-s-the-story-morning-glory')
  })

  it('collapses multiple hyphens into one', () => {
    const d = {
      ...baseDiscussion,
      album: { ...baseDiscussion.album, title: 'A --- B' },
    }
    const filename = generateJekyllFilename(d, '_posts', PUBLISH_DATE)
    // Multiple non-alphanum runs become a single hyphen
    expect(filename).not.toMatch(/--/)
  })

  it('prepends the provided postsPath', () => {
    expect(generateJekyllFilename(baseDiscussion, '_posts/rock', PUBLISH_DATE)).toMatch(
      /^_posts\/rock\//,
    )
  })

  it('always ends with .md', () => {
    expect(generateJekyllFilename(baseDiscussion, '_posts', PUBLISH_DATE)).toMatch(/\.md$/)
  })
})

// ── generateJekyllPost ────────────────────────────────────────────────────────

describe('generateJekyllPost', () => {
  it('uses type: post instead of layout: post', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain('type: post')
    expect(post).not.toContain('layout: post')
  })

  it('includes required YAML front matter fields', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain('album_title: "OK Computer"')
    expect(post).toContain('artist: "Radiohead"')
    expect(post).toContain('discussed_date: 2024-06-15')
    expect(post).toContain('members: ["Alice", "Bob"]')
    expect(post).toContain('picked_by: "Alice"')
  })

  it('includes the composite title field', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain('title: "Album Club: OK Computer - Radiohead"')
  })

  it('includes the publish date field', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain(`date: ${PUBLISH_DATE}`)
  })

  it('includes excerpt_separator', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain('excerpt_separator: <!--more-->')
  })

  it('includes the header block when coverArtUrl is present', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain('header:')
    expect(post).toContain('  teaser: "https://example.com/cover.jpg"')
    expect(post).toContain('  header: "https://example.com/cover.jpg"')
  })

  it('omits the header block when coverArtUrl is absent', () => {
    const d: DiscussionData = {
      ...baseDiscussion,
      album: { title: 'Minimal', artist: 'Nobody' },
    }
    const post = generateJekyllPost(d, PUBLISH_DATE)
    expect(post).not.toContain('header:')
    expect(post).not.toContain('teaser:')
  })

  it('includes the permalink', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain('permalink: /blog/2024/06/15/radiohead-ok-computer/')
  })

  it('includes optional front matter fields when present', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
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
    const post = generateJekyllPost(d, PUBLISH_DATE)
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
    const post = generateJekyllPost(d, PUBLISH_DATE)
    expect(post).toContain('album_title: "He said \\"hello\\""')
  })

  it('has correct song ratings table headers', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain('| # | Song | Alice | Bob |')
  })

  it('has separator row in the table', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain('|---|------|')
  })

  it('renders each song as a table row', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain('| 1 | Airbag |')
    expect(post).toContain('| 2 | Paranoid Android |')
  })

  it('renders tag values in song rows', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    // Alice tagged song 1 as Starter, Bob as Bench
    expect(post).toContain('| 1 | Airbag | Starter | Bench |')
  })

  it('renders em-dash for missing tags', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    // Bob has no tag for song 2
    expect(post).toContain('| 2 | Paranoid Android | Bench | — |')
  })

  it('includes notes section for members with notes', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).toContain("## Alice's Notes")
    expect(post).toContain('Great opener.')
  })

  it('omits notes section for members with empty notes', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
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
    const post = generateJekyllPost(d, PUBLISH_DATE)
    expect(post).not.toContain("## Alice's Notes")
    expect(post).not.toContain("## Bob's Notes")
  })

  it('falls back to pickedBy login when member not in members map', () => {
    const d: DiscussionData = {
      ...baseDiscussion,
      pickedBy: 'unknown-login',
    }
    const post = generateJekyllPost(d, PUBLISH_DATE)
    expect(post).toContain('picked_by: "unknown-login"')
  })

  it('does not include the album title/artist heading in the body', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post).not.toContain('## OK Computer — Radiohead')
  })

  it('wraps content with front matter delimiters', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE)
    expect(post.startsWith('---\n')).toBe(true)
    // Second --- ends the front matter
    const secondDash = post.indexOf('---\n', 4)
    expect(secondDash).toBeGreaterThan(4)
  })
})

// ── DEFAULT_TEMPLATE ──────────────────────────────────────────────────────────

describe('DEFAULT_TEMPLATE', () => {
  it('contains all expected variable placeholders', () => {
    expect(DEFAULT_TEMPLATE).toContain('{{album_title}}')
    expect(DEFAULT_TEMPLATE).toContain('{{title}}')
    expect(DEFAULT_TEMPLATE).toContain('{{date}}')
    expect(DEFAULT_TEMPLATE).toContain('{{artist}}')
    expect(DEFAULT_TEMPLATE).toContain('{{cover_art}}')
    expect(DEFAULT_TEMPLATE).toContain('{{permalink}}')
    expect(DEFAULT_TEMPLATE).toContain('{{song_table}}')
    expect(DEFAULT_TEMPLATE).toContain('{{notes}}')
  })
})

// ── generateJekyllPost with custom template ───────────────────────────────────

describe('generateJekyllPost with custom template', () => {
  it('substitutes {{album_title}} with the album title', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE, 'title: {{album_title}}')
    expect(post).toBe('title: OK Computer')
  })

  it('substitutes {{song_table}} with the song ratings table', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE, '{{song_table}}')
    expect(post).toContain('| 1 | Airbag |')
  })

  it('replaces unknown variables with empty string', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE, 'x={{unknown_var}}')
    expect(post).toBe('x=')
  })

  it('substitutes {{permalink}} with the correct path', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE, '{{permalink}}')
    expect(post).toBe('/blog/2024/06/15/radiohead-ok-computer/')
  })

  it('substitutes {{date}} with the publish date', () => {
    const post = generateJekyllPost(baseDiscussion, PUBLISH_DATE, '{{date}}')
    expect(post).toBe(PUBLISH_DATE)
  })
})
