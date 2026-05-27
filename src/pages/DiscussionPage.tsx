import { useState, useEffect, useRef } from 'react'
import { Eye, Disc3 } from 'lucide-react'
import { SongRow } from '../components/SongRow'
import { NotesEditor } from '../components/NotesEditor'
import { MergedView } from '../components/MergedView'
import { Button } from '../components/ui/Button'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { Spinner } from '../components/ui/Spinner'
import { useSongTags } from '../hooks/useSongTags'
import { useNotes } from '../hooks/useNotes'
import { useRealtimeReveal } from '../hooks/useRealtimeReveal'
import { backend } from '../lib/backends'
import { mergeDiscussion } from '../lib/merge/merger'
import { useAuth } from '../lib/auth/AuthContext'
import type { CurrentAlbum } from '../types/album'
import type { Member } from '../types/member'
import type { DiscussionData } from '../types/discussion'

interface DiscussionPageProps {
  currentAlbum: CurrentAlbum | null
  members: Member[]
}

export function DiscussionPage({ currentAlbum, members }: DiscussionPageProps) {
  const { member } = useAuth()
  const userId = member?.userId ?? null
  const albumId = currentAlbum?.id ?? null

  const { tags: myTags, setTag, saving: tagSaving, error: tagError } = useSongTags(userId, albumId)
  const { notes: myNotes, onChange: onNotesChange, saving: notesSaving, saved: notesSaved, error: notesError } = useNotes(userId, albumId)
  const revealState = useRealtimeReveal(albumId)

  const [revealing, setRevealing] = useState(false)
  const [revealError, setRevealError] = useState<string | null>(null)
  const [discussion, setDiscussion] = useState<DiscussionData | null>(null)
  const [loadingDiscussion, setLoadingDiscussion] = useState(false)

  const membersRef = useRef(members)
  membersRef.current = members

  const revealLoadedForRef = useRef<string | null>(null)

  useEffect(() => {
    setDiscussion(null)
    setLoadingDiscussion(false)
    setRevealError(null)
    revealLoadedForRef.current = null
  }, [albumId])

  useEffect(() => {
    if (!revealState.revealed || !currentAlbum || !albumId) return
    if (revealLoadedForRef.current === albumId) return
    revealLoadedForRef.current = albumId
    setLoadingDiscussion(true)

    async function loadOrCreateDiscussion() {
      if (!currentAlbum || !albumId) return
      try {
        // Always fetch members fresh — avoids a race with App.tsx's getMembers()
        // where membersRef could be empty and produce an empty merged discussion
        // that overwrites real data in the DB.
        const allMembers = await backend.storage.getMembers()
        const memberData = await Promise.all(
          allMembers.map(async (m) => {
            const [tags, notes] = await Promise.all([
              backend.storage.getTags(m.userId, albumId).catch(() => null),
              backend.storage.getNotes(m.userId, albumId).catch(() => null),
            ])
            return { member: m, tags, notes }
          }),
        )
        const merged = mergeDiscussion(
          currentAlbum,
          memberData,
          revealState.revealedAt ?? new Date().toISOString(),
        )
        await backend.storage.upsertDiscussion(merged)
        setDiscussion(merged)
      } catch {
        // Merge failed — fall back to whatever is already in the DB
        try {
          const existing = await backend.storage.getDiscussion(albumId)
          if (existing) { setDiscussion(existing); return }
        } catch { /* ignore */ }
        setRevealError('Failed to merge discussion')
      } finally {
        setLoadingDiscussion(false)
      }
    }

    loadOrCreateDiscussion()
  }, [revealState.revealed, revealState.revealedAt, currentAlbum, albumId])

  async function handleReveal() {
    if (!albumId || !userId) return
    setRevealing(true)
    setRevealError(null)
    try {
      const { revealedAt } = await backend.storage.createReveal(userId, albumId)
      revealState.markRevealed(userId, revealedAt)
    } catch (e) {
      setRevealError(e instanceof Error ? e.message : 'Reveal failed')
    } finally {
      setRevealing(false)
    }
  }

  if (!currentAlbum) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Disc3 className="h-12 w-12 mb-3" />
        <p>No album selected. Go pick one!</p>
      </div>
    )
  }

  const otherMembers = members.filter((m) => m.userId !== userId)

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex gap-4 items-center">
        {currentAlbum.album.coverArtUrl ? (
          <img
            src={currentAlbum.album.coverArtUrl}
            alt={currentAlbum.album.title}
            className="h-16 w-16 rounded-lg object-cover shrink-0"
            onError={(e) => { e.currentTarget.hidden = true }}
          />
        ) : (
          <div className="h-16 w-16 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Disc3 className="h-7 w-7 text-indigo-300" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-gray-900">{currentAlbum.album.title}</h2>
          <p className="text-sm text-gray-500">{currentAlbum.album.artist}</p>
        </div>
      </div>

      {tagError && <ErrorBanner message={tagError} />}
      {notesError && <ErrorBanner message={notesError} />}
      {revealError && <ErrorBanner message={revealError} />}
      {revealState.error && <ErrorBanner message={`Reveal check failed: ${revealState.error}`} />}

      {revealState.revealed ? (
        loadingDiscussion ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : discussion ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              Discussion revealed! All tags and notes are now visible.
            </div>
            <MergedView discussion={discussion} />
          </div>
        ) : null
      ) : (
        <div className="space-y-6">
          <div className="rounded-md bg-indigo-50 border border-indigo-200 p-3 text-sm text-indigo-800">
            Discuss the album with your club members, then click <strong>Reveal</strong> when ready.
            Others' choices are hidden until revealed.
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Tags</h3>
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              {currentAlbum.songs.map((song) => (
                <SongRow
                  key={song.position}
                  song={song}
                  tag={myTags[String(song.position)]}
                  onTag={setTag}
                  disabled={tagSaving}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Notes</h3>
            <NotesEditor
              value={myNotes}
              onChange={onNotesChange}
              saving={notesSaving}
              saved={notesSaved}
            />
          </div>

          {otherMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Other Members</h3>
              <div className="space-y-3">
                {otherMembers.map((m) => (
                  <div key={m.userId} className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">{m.displayName}</div>
                    <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
                      {currentAlbum.songs.map((song) => (
                        <SongRow
                          key={song.position}
                          song={song}
                          tag={undefined}
                          onTag={() => {}}
                          hiddenTag
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 italic">Notes hidden until reveal.</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <Button onClick={handleReveal} disabled={revealing} size="lg" className="w-full sm:w-auto">
              <Eye className="h-5 w-5" />
              {revealing ? 'Revealing...' : 'Reveal All Choices'}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              This reveals everyone's tags and notes simultaneously.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
