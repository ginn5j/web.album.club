import type { DiscussionData } from '../../types/discussion'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function formatDate(isoString: string): string {
  return isoString.slice(0, 10) // YYYY-MM-DD
}

function formatDateLong(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export const DEFAULT_TEMPLATE = `---
type: post
album_title: "{{album_title}}"
title: "{{title}}"
date: {{date}}
excerpt_separator: <!--more-->
artist: "{{artist}}"
release_year: {{release_year}}
genre: {{genre}}
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

  return {
    album_title: album.title,
    artist: album.artist,
    title: `Album Club: ${album.title} - ${album.artist}`,
    date: publishDate,
    discussed_date: formatDate(discussedAt),
    release_year: album.releaseYear != null ? String(album.releaseYear) : '',
    genre: album.genre ?? '',
    mbid: album.mbid ?? '',
    cover_art: album.coverArtUrl ?? '',
    members_list: `[${memberNames.map((n) => `"${n}"`).join(', ')}]`,
    picked_by: pickedByName,
    permalink: `/blog/${year}/${month}/${day}/${artistSlug}-${titleSlug}/`,
    song_table: songTable,
    notes: notesSections,
    discussed_line: `Discussed on ${dateLong}. Picked by ${pickedByName}.`,
    tag_legend: tagLegend,
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
  const year = publishDate.slice(0, 4)
  const month = publishDate.slice(5, 7)
  const day = publishDate.slice(8, 10)
  const artistSlug = slugify(discussion.album.artist)
  const titleSlug = slugify(discussion.album.title)
  return `${postsPath}/${year}/${month}/${year}-${month}-${day}-${artistSlug}-${titleSlug}.md`
}

export function generateJekyllPost(
  discussion: DiscussionData,
  publishDate: string,
  template?: string,
): string {
  if (template) {
    return applyTemplate(template, buildTemplateVars(discussion, publishDate))
  }

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

  // Build song ratings table
  const tagHeaders = memberEntries.map(([, m]) => m.name).join(' | ')
  const tableHeader = `| # | Song | ${tagHeaders} |`
  const tableSep = `|---|------|${memberEntries.map(() => '---').join('|')}|`

  const tableRows = songs
    .map((song) => {
      const tags = memberEntries
        .map(([, m]) => m.tags[String(song.position)] ?? '—')
        .join(' | ')
      return `| ${song.position} | ${song.title} | ${tags} |`
    })
    .join('\n')

  // Build member notes sections
  const notesSections = memberEntries
    .filter(([, m]) => m.notes.trim())
    .map(([, m]) => `## ${m.name}'s Notes\n\n${m.notes}`)
    .join('\n\n---\n\n')

  const escapedTitle = album.title.replace(/"/g, '\\"')
  const escapedArtist = album.artist.replace(/"/g, '\\"')
  const permalink = `/blog/${year}/${month}/${day}/${artistSlug}-${titleSlug}/`

  const frontMatterLines: (string | null)[] = [
    '---',
    'type: post',
    `album_title: "${escapedTitle}"`,
    `title: "Album Club: ${escapedTitle} - ${escapedArtist}"`,
    `date: ${publishDate}`,
    'excerpt_separator: <!--more-->',
    `artist: "${escapedArtist}"`,
    album.releaseYear != null ? `release_year: ${album.releaseYear}` : null,
    album.genre ? `genre: ${album.genre}` : null,
    `discussed_date: ${formatDate(discussedAt)}`,
    album.mbid ? `mbid: "${album.mbid}"` : null,
    album.coverArtUrl ? `cover_art: "${album.coverArtUrl}"` : null,
    `members: [${memberNames.map((n) => `"${n}"`).join(', ')}]`,
    `picked_by: "${pickedByName}"`,
    ...(album.coverArtUrl
      ? [`header:`, `  teaser: "${album.coverArtUrl}"`, `  header: "${album.coverArtUrl}"`]
      : []),
    `permalink: ${permalink}`,
    '---',
  ]

  const frontMatter = frontMatterLines.filter((l) => l !== null).join('\n')

  const body = [
    `Discussed on ${dateLong}. Picked by ${pickedByName}.`,
    '',
    '---',
    '',
    '## Song Ratings',
    '',
    tableHeader,
    tableSep,
    tableRows,
    '',
    `**Legend:** ${tagLegend}`,
    '',
    '---',
    '',
    notesSections,
  ].join('\n')

  return `${frontMatter}\n\n${body}\n`
}
