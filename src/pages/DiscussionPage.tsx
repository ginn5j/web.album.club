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
import { useDiscussionState } from '../hooks/useDiscussionState'
import { readTags } from '../lib/storage/tags'
import { readNotes } from '../lib/storage/notes'
import { writeReveal } from '../lib/storage/reveal'
import { readDiscussion, writeDiscussion } from '../lib/storage/discussion'
import { mergeDiscussion } from '../lib/merge/merger'
import type { CurrentAlbum } from '../types/album'
import type { Member } from '../types/member'
import type { DiscussionData } from '../types/discussion'
import type { LocalSettings } from '../lib/settings'

interface DiscussionPageProps {
  currentAlbum: CurrentAlbum | null
  members: Member[]
  settings: LocalSettings
}

export function DiscussionPage({ currentAlbum, members, settings }: DiscussionPageProps) {
  // Use member.branch from members.json — must match where reveal.json is written
  const myMember = members.find((m) => m.login === settings.myLogin)
  const myBranch = myMember?.branch ?? settings.myLogin
  const albumId = currentAlbum?.id ?? null

  const { tags: myTags, setTag, saving: tagSaving, error: tagError } = useSongTags(
    settings,
    myBranch,
    albumId,
  )

  const { notes: myNotes, onChange: onNotesChange, saving: notesSaving, saved: notesSaved, error: notesError } = useNotes(
    settings,
    myBranch,
    albumId,
  )

  const discussionState = useDiscussionState(settings, members, albumId)

  const [revealing, setRevealing] = useState(false)
  const [revealError, setRevealError] = useState<string | null>(null)
  const [discussion, setDiscussion] = useState<DiscussionData | null>(null)
  const [loadingDiscussion, setLoadingDiscussion] = useState(false)

  // Keep a ref to the latest members so the reveal effect doesn't need members in its deps
  // (members arrives asynchronously and we don't want it to re-trigger the reveal load)
  const membersRef = useRef(members)
  membersRef.current = members

  // Track which albumId we've already loaded the post-reveal discussion for,
  // so a late-arriving members update doesn't trigger a second load.
  const revealLoadedForRef = useRef<string | null>(null)

  // Reset local discussion state when the album changes
  useEffect(() => {
    setDiscussion(null)
    setLoadingDiscussion(false)
    setRevealError(null)
    revealLoadedForRef.current = null
  }, [albumId])

  // When revealed, load (or create) the merged discussion — runs once per albumId
  useEffect(() => {
    if (!discussionState.revealed || !currentAlbum || !albumId) return
    if (revealLoadedForRef.current === albumId) return
    revealLoadedForRef.current = albumId
    setLoadingDiscussion(true)

    async function loadOrCreateDiscussion() {
      if (!currentAlbum || !albumId) return
      try {
        // Read fresh tags and notes from all member branches
        const memberData = await Promise.all(
          membersRef.current.map(async (m) => {
            const [tags, notes] = await Promise.all([
              readTags(settings.pat, settings.repoOwner, settings.repoName, m.branch, albumId).catch(() => null),
              readNotes(settings.pat, settings.repoOwner, settings.repoName, m.branch, albumId).catch(() => null),
            ])
            return { member: m, tags, notes }
          }),
        )

        const merged = mergeDiscussion(
          currentAlbum,
          memberData,
          discussionState.revealedAt ?? new Date().toISOString(),
        )
        await writeDiscussion(settings.pat, settings.repoOwner, settings.repoName, merged)
        setDiscussion(merged)
      } catch (e) {
        // Write may fail if another client already wrote it; fall back to existing
        try {
          const existing = await readDiscussion(settings.pat, settings.repoOwner, settings.repoName, albumId)
          if (existing) {
            setDiscussion(existing)
            return
          }
        } catch { /* ignore */ }
        setRevealError(e instanceof Error ? e.message : 'Failed to merge discussion')
      } finally {
        setLoadingDiscussion(false)
      }
    }

    loadOrCreateDiscussion()
  }, [discussionState.revealed, discussionState.revealedAt, currentAlbum, albumId, settings])

  async function handleReveal() {
    if (!albumId || !currentAlbum) return
    setRevealing(true)
    setRevealError(null)
    try {
      const revealedAt = new Date().toISOString()
      await writeReveal(settings.pat, settings.repoOwner, settings.repoName, myBranch, albumId)
      // Skip the read-back — immediately transition this client to revealed so
      // the revealing user sees the merge without waiting for API propagation
      discussionState.markRevealed(settings.myLogin, revealedAt)
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

  const otherMembers = members.filter((m) => m.login !== settings.myLogin)

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex gap-4 items-center">
        {currentAlbum.album.coverArtUrl ? (
          <img
            src={currentAlbum.album.coverArtUrl}
            alt={currentAlbum.album.title}
            className="h-16 w-16 rounded-lg object-cover shrink-0"
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
      {discussionState.checkError && (
        <ErrorBanner message={`Reveal check failed: ${discussionState.checkError}`} />
      )}

      {discussionState.revealed ? (
        /* Phase 2: Revealed */
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
        /* Phase 1: Discuss */
        <div className="space-y-6">
          <div className="rounded-md bg-indigo-50 border border-indigo-200 p-3 text-sm text-indigo-800">
            Discuss the album with your club members, then click <strong>Reveal</strong> when ready.
            Others' choices are hidden until revealed.
          </div>

          {/* My tags */}
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

          {/* My notes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Notes</h3>
            <NotesEditor
              value={myNotes}
              onChange={onNotesChange}
              saving={notesSaving}
              saved={notesSaved}
            />
          </div>

          {/* Other members (hidden) */}
          {otherMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Other Members</h3>
              <div className="space-y-3">
                {otherMembers.map((m) => (
                  <div key={m.login} className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">{m.name}</div>
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

          {/* Reveal button */}
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
