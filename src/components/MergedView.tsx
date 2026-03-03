import type { DiscussionData } from '../types/discussion'
import { MemberTagCell } from './SongRow'

interface MergedViewProps {
  discussion: DiscussionData
}

export function MergedView({ discussion }: MergedViewProps) {
  const { songs, members } = discussion
  const memberEntries = Object.entries(members)

  return (
    <div className="space-y-8">
      {/* Song ratings table */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Song Ratings</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="pr-4 py-2 w-8">#</th>
                <th className="pr-6 py-2">Song</th>
                {memberEntries.map(([login, m]) => (
                  <th key={login} className="px-4 py-2 text-center">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {songs.map((song) => (
                <tr key={song.position}>
                  <td className="pr-4 py-2 text-xs text-gray-400">{song.position}</td>
                  <td className="pr-6 py-2 font-medium text-gray-900">{song.title}</td>
                  {memberEntries.map(([login, m]) => (
                    <td key={login} className="px-4 py-2 text-center">
                      <MemberTagCell tag={m.tags[String(song.position)]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          <strong>Legend:</strong> Starter = would start a playlist · Bench = solid · Cut = would skip
        </p>
      </div>

      {/* Member notes */}
      {memberEntries.map(([login, m]) =>
        m.notes.trim() ? (
          <div key={login}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">{m.name}'s Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md p-4">
              {m.notes}
            </p>
          </div>
        ) : null,
      )}
    </div>
  )
}
