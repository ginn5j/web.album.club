export interface ChangelogEntry {
  date: string
  title: string
  items: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-03-25',
    title: 'Blog publishing improvements',
    items: [
      'Update Jekyll post front matter: type, album_title, title, date, excerpt_separator, header, permalink',
      'Remove redundant album heading from post body',
      'Filename now uses year/month subdirectory structure',
      'Publish date defaults to now and is free-form editable before publishing',
      'Users can save a custom {{variable}} post template in Settings',
    ],
  },
  {
    date: '2026-03-24',
    title: 'Wishlist notes and blog output settings',
    items: [
      'Add per-item notes to wishlist entries',
      'Load blog output settings from GitHub on Settings page mount',
    ],
  },
  {
    date: '2026-03-05',
    title: 'Tests and CI pipeline',
    items: [
      'Add unit and functional tests with Vitest',
      'Wire test suite into CI/CD pipeline',
    ],
  },
  {
    date: '2026-03-04',
    title: 'MusicBrainz search improvements',
    items: [
      'Switch release search back to /release endpoint with Lucene query support',
    ],
  },
  {
    date: '2026-03-03',
    title: 'Performance and deployment',
    items: [
      'Reduce album poll interval to 15s',
      'Move deploy path to album-club',
    ],
  },
  {
    date: '2026-03-02',
    title: 'Initial release',
    items: [
      'Tag songs as Starter, Bench, or Cut on the active album',
      'Write private notes per song',
      'Simultaneous reveal: everyone reveals at once',
      'Post-reveal discussion view with merged tags and notes',
      'Wishlist for future albums',
      'Publish discussions as Jekyll blog posts',
      'All data stored in a GitHub repo — no server required',
    ],
  },
]
