import { Disc3 } from 'lucide-react'
import { SongRow } from '../components/SongRow'
import { NotesEditor } from '../components/NotesEditor'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { useSongTags } from '../hooks/useSongTags'
import { useNotes } from '../hooks/useNotes'
import type { CurrentAlbum } from '../types/album'
import type { Member } from '../types/member'
import type { LocalSettings } from '../lib/settings'

interface AlbumPageProps {
  currentAlbum: CurrentAlbum | null
  settings: LocalSettings
  members: Member[]
}

export function AlbumPage({ currentAlbum, settings, members }: AlbumPageProps) {
  const myMember = members.find((m) => m.login === settings.myLogin)
  const myBranch = myMember?.branch ?? settings.myLogin

  const { tags, setTag, saving: tagSaving, error: tagError } = useSongTags(
    settings,
    myBranch,
    currentAlbum?.id ?? null,
  )

  const { notes, onChange: onNotesChange, saving: notesSaving, saved: notesSaved, error: notesError } = useNotes(
    settings,
    myBranch,
    currentAlbum?.id ?? null,
  )

  if (!currentAlbum) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Disc3 className="h-12 w-12 mb-3" />
        <p>No album selected. Go pick one!</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Album header */}
      <div className="flex gap-4 items-center">
        {currentAlbum.album.coverArtUrl ? (
          <img
            src={currentAlbum.album.coverArtUrl}
            alt={currentAlbum.album.title}
            className="h-20 w-20 rounded-lg object-cover shrink-0"
            onError={(e) => { e.currentTarget.hidden = true }}
          />
        ) : (
          <div className="h-20 w-20 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Disc3 className="h-8 w-8 text-indigo-300" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-gray-900">{currentAlbum.album.title}</h2>
          <p className="text-gray-600 text-sm">{currentAlbum.album.artist}</p>
          {tagSaving && <span className="text-xs text-indigo-500">Saving tags...</span>}
        </div>
      </div>

      {tagError && <ErrorBanner message={tagError} />}
      {notesError && <ErrorBanner message={notesError} />}

      {/* Legend */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
        <strong>Starter</strong> = would start a playlist ·{' '}
        <strong>Bench</strong> = solid ·{' '}
        <strong>Cut</strong> = would skip
      </div>

      {/* Song list */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
        {currentAlbum.songs.map((song) => (
          <SongRow
            key={song.position}
            song={song}
            tag={tags[String(song.position)]}
            onTag={setTag}
            disabled={tagSaving}
          />
        ))}
      </div>

      {/* Notes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Notes</h3>
        <NotesEditor
          value={notes}
          onChange={onNotesChange}
          saving={notesSaving}
          saved={notesSaved}
        />
      </div>
    </div>
  )
}
