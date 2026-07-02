import type { DiscussionData } from '../../types/discussion'
import { slugify } from '../slugify'

function formatDate(isoString: string): string {
  return isoString.slice(0, 10) // YYYY-MM-DD
}

function formatDateLong(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// For values substituted inside double-quoted YAML front matter strings.
// Backslash must be escaped first — it's YAML's escape character inside
// double quotes, so a raw one corrupts the string (or eats the closing quote).
function escapeYamlQuotes(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

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
  header: "{{cover_art}}"
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
): Record<string, string> {
  const { album, songs, members, pickedBy, discussedAt } = discussion
  const memberEntries = Object.entries(members)
  const memberNames = memberEntries.map(([, m]) => m.name)
  const pickedByName = members[pickedBy]?.name ?? pickedBy
  const dateLong = formatDateLong(discussedAt)
  const year = publishDate.slice(0, 4)
  const month = publishDate.slice(5, 7)
  const day = publishDate.slice(8, 10)
  const artistSlug = slugify(album.artist)
  const titleSlug = slugify(album.title)
  const tagLegend = 'Starter = would start a playlist | Bench = solid | Cut = would skip'

  const tagHeaders = memberEntries.map(([, m]) => m.name).join(' | ')
  const tableHeader = `| # | Song | ${tagHeaders} |`
  const tableSep = `|---|------|${memberEntries.map(() => '---').join('|')}|`
  const tableRows = songs
    .map((song) => {
      const tags = memberEntries.map(([, m]) => m.tags[String(song.position)] ?? '—').join(' | ')
      return `| ${song.position} | ${song.title} | ${tags} |`
    })
    .join('\n')
  const songTable = [tableHeader, tableSep, tableRows, '', `**Legend:** ${tagLegend}`].join('\n')

  const notesSections = memberEntries
    .filter(([, m]) => m.notes.trim())
    .map(([, m]) => `## ${m.name}'s Notes\n\n${m.notes}`)
    .join('\n\n---\n\n')

  // Front-matter vars (album_title, artist, title, genre, picked_by,
  // members_list) are quote-escaped because the templates wrap them in
  // double-quoted YAML strings. Body vars (discussed_line, song_table, notes)
  // are left raw.
  return {
    album_title: escapeYamlQuotes(album.title),
    artist: escapeYamlQuotes(album.artist),
    title: escapeYamlQuotes(`Album Club: ${album.title} - ${album.artist}`),
    date: publishDate,
    discussed_date: formatDate(discussedAt),
    release_year: album.releaseYear != null ? String(album.releaseYear) : '',
    genre: escapeYamlQuotes(album.genre ?? ''),
    mbid: album.mbid ?? '',
    cover_art: album.coverArtUrl ?? '',
    members_list: `[${memberNames.map((n) => `"${escapeYamlQuotes(n)}"`).join(', ')}]`,
    picked_by: escapeYamlQuotes(pickedByName),
    permalink: `/blog/${year}/${month}/${day}/${artistSlug}-${titleSlug}/`,
    song_table: songTable,
    notes: notesSections,
    discussed_line: `Discussed on ${dateLong}. Picked by ${pickedByName}.`,
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

// Without a custom template, front matter is assembled line by line so that
// absent optional fields (release year, genre, mbid, cover art) are omitted
// entirely rather than emitted with empty values.
export function generateJekyllPost(
  discussion: DiscussionData,
  publishDate: string,
  template?: string,
): string {
  const vars = buildTemplateVars(discussion, publishDate)

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
    album.releaseYear != null ? `release_year: ${vars.release_year}` : null,
    album.genre ? `genre: "${vars.genre}"` : null,
    `discussed_date: ${vars.discussed_date}`,
    album.mbid ? `mbid: "${vars.mbid}"` : null,
    album.coverArtUrl ? `cover_art: "${vars.cover_art}"` : null,
    `members: ${vars.members_list}`,
    `picked_by: "${vars.picked_by}"`,
    ...(album.coverArtUrl
      ? [`header:`, `  teaser: "${vars.cover_art}"`, `  header: "${vars.cover_art}"`]
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
