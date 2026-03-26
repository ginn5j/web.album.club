import { changelog } from '../data/changelog'

export function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">About Album Club</h1>
        <div className="prose text-gray-700 space-y-3">
          <p>
            Album Club is a tool for small groups to listen to music together — like a book club,
            but for albums. Each member privately tags every song as <strong>Starter</strong>{' '}
            (would open a playlist), <strong>Bench</strong> (solid but not a standout), or{' '}
            <strong>Cut</strong> (would skip), and writes their own notes.
          </p>
          <p>
            When everyone is ready, all tags and notes are revealed simultaneously so no one is
            influenced by others' opinions beforehand. The results are merged into a discussion
            summary that can be published as a blog post.
          </p>
          <p>
            All data lives in a GitHub repository — one shared branch for the active album and
            discussion records, and a private branch per member for tags and notes. There is no
            server and no account to create beyond a GitHub personal access token.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Changelog</h2>
        <div className="overflow-y-auto max-h-[60vh] border border-gray-200 rounded-lg divide-y divide-gray-100">
          {changelog.map((entry) => (
            <div key={entry.date} className="px-4 py-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-xs font-mono text-gray-400 whitespace-nowrap">
                  {entry.date}
                </span>
                <span className="text-sm font-semibold text-gray-800">{entry.title}</span>
              </div>
              <ul className="space-y-1">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-gray-300 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
