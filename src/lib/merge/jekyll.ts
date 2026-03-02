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

export function generateJekyllFilename(
  discussion: DiscussionData,
  postsPath: string,
): string {
  const date = formatDate(discussion.discussedAt)
  const artistSlug = slugify(discussion.album.artist)
  const titleSlug = slugify(discussion.album.title)
  return `${postsPath}/${date}-${artistSlug}-${titleSlug}.md`
}

export function generateJekyllPost(discussion: DiscussionData): string {
  const { album, songs, members, pickedBy, discussedAt } = discussion
  const memberEntries = Object.entries(members)
  const memberNames = memberEntries.map(([, m]) => m.name)
  const pickedByName = members[pickedBy]?.name ?? pickedBy
  const dateLong = formatDateLong(discussedAt)
  const date = formatDate(discussedAt)

  const tagLegend = 'Starter = would start a playlist | Bench = solid | Cut = would skip'

  // Build song ratings table
  const tagHeaders = memberEntries.map(([, m]) => m.name).join(' | ')
  const tableHeader = `| # | Song | ${tagHeaders} |`
  const tableSep = `|---|------|${memberEntries.map(() => '---').join('|')}|`

  const tableRows = songs
    .map((song) => {
      const tags = memberEntries.map(([, m]) => {
        return m.tags[String(song.position)] ?? '—'
      }).join(' | ')
      return `| ${song.position} | ${song.title} | ${tags} |`
    })
    .join('\n')

  // Build member notes sections
  const notesSections = memberEntries
    .filter(([, m]) => m.notes.trim())
    .map(([, m]) => `## ${m.name}'s Notes\n\n${m.notes}`)
    .join('\n\n---\n\n')

  const frontMatter = [
    '---',
    'layout: post',
    `title: "${album.title.replace(/"/g, '\\"')}"`,
    `artist: "${album.artist.replace(/"/g, '\\"')}"`,
    album.releaseYear ? `release_year: ${album.releaseYear}` : null,
    album.genre ? `genre: ${album.genre}` : null,
    `discussed_date: ${date}`,
    album.mbid ? `mbid: "${album.mbid}"` : null,
    album.coverArtUrl ? `cover_art: "${album.coverArtUrl}"` : null,
    `members: [${memberNames.map((n) => `"${n}"`).join(', ')}]`,
    `picked_by: "${pickedByName}"`,
    '---',
  ]
    .filter((l) => l !== null)
    .join('\n')

  const body = [
    `## ${album.title} — ${album.artist}${album.releaseYear ? ` (${album.releaseYear})` : ''}`,
    '',
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
  ]
    .join('\n')

  return `${frontMatter}\n\n${body}\n`
}
