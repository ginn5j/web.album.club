import type { Song } from '../types/album'
import type { TagValue } from '../types/discussion'

const TAG_OPTIONS: TagValue[] = ['Starter', 'Bench', 'Cut']

const tagColors: Record<TagValue, string> = {
  Starter: 'bg-green-100 text-green-800 border-green-300 ring-green-400',
  Bench: 'bg-yellow-100 text-yellow-800 border-yellow-300 ring-yellow-400',
  Cut: 'bg-red-100 text-red-800 border-red-300 ring-red-400',
}

const tagSelectedColors: Record<TagValue, string> = {
  Starter: 'bg-green-500 text-white border-green-500',
  Bench: 'bg-yellow-500 text-white border-yellow-500',
  Cut: 'bg-red-500 text-white border-red-500',
}

interface SongRowProps {
  song: Song
  tag: TagValue | undefined
  onTag: (position: number, tag: TagValue | null) => void
  disabled?: boolean
  hiddenTag?: boolean
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function SongRow({ song, tag, onTag, disabled, hiddenTag }: SongRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="w-6 text-right text-xs text-gray-400 shrink-0">{song.position}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-900 truncate block">{song.title}</span>
        {song.durationMs && (
          <span className="text-xs text-gray-400">{formatDuration(song.durationMs)}</span>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        {TAG_OPTIONS.map((t) => (
          <button
            key={t}
            disabled={disabled || hiddenTag}
            onClick={() => onTag(song.position, tag === t ? null : t)}
            title={hiddenTag ? 'Hidden until reveal' : t}
            className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 ${
              hiddenTag
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-default'
                : tag === t
                ? tagSelectedColors[t]
                : `${tagColors[t]} hover:opacity-80`
            } disabled:cursor-not-allowed`}
          >
            {hiddenTag ? '?' : t}
          </button>
        ))}
      </div>
    </div>
  )
}

interface MemberTagCellProps {
  tag: TagValue | undefined
  hidden?: boolean
}

export function MemberTagCell({ tag, hidden }: MemberTagCellProps) {
  if (hidden || !tag) {
    return <span className="text-gray-300 text-sm">?</span>
  }
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tagColors[tag]}`}
    >
      {tag}
    </span>
  )
}
