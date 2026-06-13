export interface ChangelogEntry {
  date: string
  title: string
  items: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-06-12',
    title: 'Polish',
    items: [
      'New members now appear in the roster when you return to the tab — no reload needed',
      'Album lookup failures in query search now show inline instead of a browser popup',
      'Display names are limited to 32 characters',
    ],
  },
  {
    date: '2026-06-12',
    title: 'Review follow-up fixes',
    items: [
      'Fix a temporary connection error permanently hiding the home page',
      'Always confirm before replacing an album that hasn’t been discussed',
      'Fix removing a wishlist album also removing duplicates of it',
      'Fix genres with special characters breaking published blog posts',
    ],
  },
  {
    date: '2026-06-12',
    title: 'Code review fixes',
    items: [
      'Fix a reveal by another member sometimes not appearing until refresh',
      'Fix a failed notes save being silently skipped on the next reveal',
      'Lock tags and notes once the album is revealed',
      'Fix slow search responses overwriting results for a newer query',
      'Fix rapid wishlist edits dropping a change',
      'Fix backslashes in album/artist names breaking published blog posts',
      'Display names must now be unique',
      'Reveal timestamps now come from the server clock',
      'Friendlier error when two members pick an album at the same time',
    ],
  },
  {
    date: '2026-06-12',
    title: 'Reliability fixes',
    items: [
      'Save any pending notes before revealing so they can’t be missing from the discussion',
      'Fix rapid song-tag taps dropping a tag',
      'Add a Retry button when the discussion merge fails',
      'Publishing now requires a PAT and validates the publish date',
      'Fix stale reveal instantly unmasking a newly re-picked album',
      'Fix a case where saved notes could be lost',
      'Fix onboarding resetting an existing member’s role',
      'Fix discussion merge race so two clients can’t write conflicting snapshots',
      'Run lint, tests, and build on every pull request',
    ],
  },
  {
    date: '2026-06-09',
    title: 'New artist + release search',
    items: [
      'Two-field Artist + Release search: pick an artist, then browse their releases',
      'Release rows show format, track count, and country, with expandable per-track detail',
      'Releases sorted by date, including partial dates',
      'Choose your preferred search style in Settings (saved across sessions)',
    ],
  },
  {
    date: '2026-05-29',
    title: 'Customizable blog posts path',
    items: [
      'Jekyll posts path can include {{variable}} templates',
    ],
  },
  {
    date: '2026-05-28',
    title: 'Supabase backend',
    items: [
      'Storage moved from a GitHub repo to Supabase (Postgres + Auth + Realtime)',
      'Sign in with an email magic link',
      'Tags and notes stay private until reveal, enforced by row-level security',
      'Reveals appear live via realtime updates instead of polling',
      'Undiscussed albums are cleaned up when a new album is picked',
    ],
  },
  {
    date: '2026-05-09',
    title: 'Wishlist tidy-up',
    items: [
      'Wishlist items are removed automatically when picked as the current album',
    ],
  },
  {
    date: '2026-04-23',
    title: 'Wishlist reordering and search filters',
    items: [
      'Drag-to-reorder and up/down buttons on the wishlist',
      'Format filter dropdown on album search',
      'Confirm before picking a new album while the current one is undiscussed',
    ],
  },
  {
    date: '2026-03-29',
    title: 'Search result improvements',
    items: [
      'Search results show cover art and format',
      'Country and year filter inputs',
      'Results sorted by release year',
    ],
  },
  {
    date: '2026-03-26',
    title: 'About page',
    items: [
      'Add About page with app summary and this changelog',
      'Fix stale member settings when publishing right after saving output settings',
    ],
  },
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
