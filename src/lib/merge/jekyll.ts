import type { DiscussionData } from '../../types/discussion'
import { slugify } from '../slugify'

function formatDate(isoString: string): string {
  return isoString.slice(0, 10) // YYYY-MM-DD
}

function formatDateLong(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Everything a post is built from is untrusted: album and song text comes from
// MusicBrainz, which anyone can edit, and names, notes and the album record
// come from rows any member can write. Types say nothing about what the
// database actually returns, so each value is coerced and escaped for the place
// it lands. The post is rendered by Jekyll (Liquid, then kramdown) on a site
// the publisher owns, so unescaped text there is script on their origin.

function text(v: unknown): string {
  return v == null ? '' : String(v)
}

// Line breaks and other control characters become a single space.
function oneLine(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]+/g, ' ')
}

// For values substituted inside double-quoted YAML front matter strings.
// - Line breaks are collapsed first: a raw one could end the string, start a
//   new key, or close the front matter with a `---` line.
// - Backslash is escaped before the quote — it's YAML's escape character inside
//   double quotes, so a raw one corrupts the string (or eats the closing quote).
// - Angle brackets become entities because themes commonly pass front matter
//   such as the title through `markdownify`, which lets raw HTML through.
function escapeYamlQuotes(v: unknown): string {
  return oneLine(text(v))
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Body text shared rules:
// - `<` becomes an entity, so no HTML tag can open (kramdown passes raw HTML
//   through otherwise).
// - A `{` that would open a Liquid tag (`{{`, `{%`) or a kramdown attribute
//   list (`{:`, which can set arbitrary attributes such as event handlers)
//   becomes an entity. Liquid then sees no tag, and the page shows a brace.
function neutralizeMarkup(s: string): string {
  return s.replace(/</g, '&lt;').replace(/\{(?=[{%:])/g, '&#123;')
}

// For multi-line Markdown the member wrote (notes). Markdown itself still
// renders — emphasis, lists, links — only HTML, Liquid and attribute lists
// are made inert.
function escapeMarkdownBlock(v: unknown): string {
  return neutralizeMarkup(text(v))
}

// For plain text placed inline in Markdown (song titles, display names): it
// should appear exactly as written, so Markdown's own inline syntax is
// backslash-escaped too, including `|`, which would otherwise split a table
// cell.
function escapeMarkdownInline(v: unknown): string {
  return neutralizeMarkup(oneLine(text(v)).replace(/[\\`*_[\]|]/g, '\\$&'))
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MBID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const DEFAULT_TEMPLATE = `---
type: post
album_title: "{{album_title}}"
title: "{{title}}"
date: {{date}}
excerpt_separator: <!--more-->
artist: "{{artist}}"
release_year: {{release_year}}
genre: "{{genre}}"
discussed_date: {{discussed_date}}
mbid: "{{mbid}}"
cover_art: "{{cover_art}}"
members: {{members_list}}
picked_by: "{{picked_by}}"
header:
  teaser: "{{cover_art}}"
  image: "{{cover_art}}"
permalink: {{permalink}}
---

{{discussed_line}}

---

## Song Ratings

{{song_table}}

---

{{notes}}
`

function buildTemplateVars(
  discussion: DiscussionData,
  publishDate: string,
  coverArt?: string,
): Record<string, string> {
  const { album, songs, members, pickedBy, discussedAt } = discussion
  const memberEntries = Object.entries(members)
  const memberNames = memberEntries.map(([, m]) => m.name)
  const pickedByName = members[pickedBy]?.name ?? pickedBy
  const discussedDate = formatDate(text(discussedAt))
  const dateLong = formatDateLong(discussedAt)
  const year = publishDate.slice(0, 4)
  const month = publishDate.slice(5, 7)
  const day = publishDate.slice(8, 10)
  const artistSlug = slugify(album.artist)
  const titleSlug = slugify(album.title)
  const tagLegend = 'Starter = would start a playlist | Bench = solid | Cut = would skip'

  const tagHeaders = memberEntries.map(([, m]) => escapeMarkdownInline(m.name)).join(' | ')
  const tableHeader = `| # | Song | ${tagHeaders} |`
  const tableSep = `|---|------|${memberEntries.map(() => '---').join('|')}|`
  const tableRows = songs
    .map((song) => {
      const tags = memberEntries
        .map(([, m]) => escapeMarkdownInline(m.tags[String(song.position)] ?? '—'))
        .join(' | ')
      return `| ${escapeMarkdownInline(song.position)} | ${escapeMarkdownInline(song.title)} | ${tags} |`
    })
    .join('\n')
  const songTable = [tableHeader, tableSep, tableRows, '', `**Legend:** ${tagLegend}`].join('\n')

  const notesSections = memberEntries
    .filter(([, m]) => text(m.notes).trim())
    .map(([, m]) => `## ${escapeMarkdownInline(m.name)}'s Notes\n\n${escapeMarkdownBlock(m.notes)}`)
    .join('\n\n---\n\n')

  // Front-matter vars (album_title, artist, title, genre, cover_art, picked_by,
  // members_list) are escaped for the double-quoted YAML strings the templates
  // wrap them in. The unquoted ones (release_year, discussed_date, mbid) are
  // emitted only when they have exactly the expected shape, and are empty
  // otherwise. Body vars (discussed_line, song_table, notes) are escaped for
  // Markdown where they are built, above.
  return {
    album_title: escapeYamlQuotes(album.title),
    artist: escapeYamlQuotes(album.artist),
    title: escapeYamlQuotes(`Album Club: ${album.title} - ${album.artist}`),
    date: publishDate,
    discussed_date: DATE_RE.test(discussedDate) ? discussedDate : '',
    release_year: Number.isInteger(album.releaseYear) ? String(album.releaseYear) : '',
    genre: escapeYamlQuotes(album.genre ?? ''),
    mbid: MBID_RE.test(text(album.mbid)) ? text(album.mbid) : '',
    cover_art: escapeYamlQuotes(coverArt ?? album.coverArtUrl ?? ''),
    members_list: `[${memberNames.map((n) => `"${escapeYamlQuotes(n)}"`).join(', ')}]`,
    picked_by: escapeYamlQuotes(pickedByName),
    permalink: `/blog/${year}/${month}/${day}/${artistSlug}-${titleSlug}/`,
    song_table: songTable,
    notes: notesSections,
    discussed_line: `Discussed on ${dateLong}. Picked by ${escapeMarkdownInline(pickedByName)}.`,
    tag_legend: tagLegend,
    year,
    month,
    day,
    artist_slug: artistSlug,
    title_slug: titleSlug,
  }
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '')
}

export function generateJekyllFilename(
  discussion: DiscussionData,
  postsPath: string,
  publishDate: string,
): string {
  const vars = buildTemplateVars(discussion, publishDate)
  const interpolatedPath = applyTemplate(postsPath, vars)
  const filename = `${vars.year}-${vars.month}-${vars.day}-${vars.artist_slug}-${vars.title_slug}.md`
  return `${interpolatedPath}/${filename}`
}

// Repo path for a captured cover image: the post's own basename under the
// assets folder, so the image sits next to nothing else it could collide with.
// Prefix it with '/' to get the site-relative URL the post refers to.
export function generateCoverArtPath(
  discussion: DiscussionData,
  assetsPath: string,
  publishDate: string,
  extension: string,
): string {
  const vars = buildTemplateVars(discussion, publishDate)
  const dir = applyTemplate(assetsPath, vars).replace(/^\/+|\/+$/g, '')
  const filename = `${vars.year}-${vars.month}-${vars.day}-${vars.artist_slug}-${vars.title_slug}.${extension}`
  return `${dir}/${filename}`
}

// Without a custom template, front matter is assembled line by line so that
// absent optional fields (release year, genre, mbid, cover art) are omitted
// entirely rather than emitted with empty values.
//
// coverArt overrides the album's remote cover URL in {{cover_art}}; publishing
// passes the site-relative path of the image it commits alongside the post.
export function generateJekyllPost(
  discussion: DiscussionData,
  publishDate: string,
  template?: string,
  coverArt?: string,
): string {
  const vars = buildTemplateVars(discussion, publishDate, coverArt)

  if (template) {
    return applyTemplate(template, vars)
  }

  const { album } = discussion

  const frontMatterLines: (string | null)[] = [
    '---',
    'type: post',
    `album_title: "${vars.album_title}"`,
    `title: "${vars.title}"`,
    `date: ${publishDate}`,
    'excerpt_separator: <!--more-->',
    `artist: "${vars.artist}"`,
    vars.release_year ? `release_year: ${vars.release_year}` : null,
    album.genre ? `genre: "${vars.genre}"` : null,
    `discussed_date: ${vars.discussed_date}`,
    vars.mbid ? `mbid: "${vars.mbid}"` : null,
    vars.cover_art ? `cover_art: "${vars.cover_art}"` : null,
    `members: ${vars.members_list}`,
    `picked_by: "${vars.picked_by}"`,
    ...(vars.cover_art
      ? [`header:`, `  teaser: "${vars.cover_art}"`, `  image: "${vars.cover_art}"`]
      : []),
    `permalink: ${vars.permalink}`,
    '---',
  ]

  const frontMatter = frontMatterLines.filter((l) => l !== null).join('\n')

  const body = [
    vars.discussed_line,
    '',
    '---',
    '',
    '## Song Ratings',
    '',
    vars.song_table,
    '',
    '---',
    '',
    vars.notes,
  ].join('\n')

  return `${frontMatter}\n\n${body}\n`
}
