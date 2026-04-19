import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Disc3, MessageSquare, ListMusic, Star } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { AlbumSearch } from '../components/AlbumSearch'
import { Spinner } from '../components/ui/Spinner'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { writeCurrentAlbum } from '../lib/storage/album'
import { readDiscussion } from '../lib/storage/discussion'
import { buildCurrentAlbum } from '../lib/musicbrainz/lookup'
import type { CurrentAlbum, AlbumInfo, Song } from '../types/album'
import type { LocalSettings } from '../lib/settings'

interface HomePageProps {
  currentAlbum: CurrentAlbum | null
  loading: boolean
  albumError: string | null
  settings: LocalSettings
  onAlbumPicked: (album: CurrentAlbum) => void
}

export function HomePage({
  currentAlbum,
  loading,
  albumError,
  settings,
  onAlbumPicked,
}: HomePageProps) {
  const navigate = useNavigate()
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmingPick, setConfirmingPick] = useState(false)
  const [checkingDiscussion, setCheckingDiscussion] = useState(false)

  async function handlePickDifferent() {
    setCheckingDiscussion(true)
    try {
      const discussion = await readDiscussion(settings.pat, settings.repoOwner, settings.repoName, currentAlbum!.id)
      if (discussion) {
        setPicking(true)
      } else {
        setConfirmingPick(true)
      }
    } catch {
      setPicking(true)
    } finally {
      setCheckingDiscussion(false)
    }
  }

  async function handleAlbumSelected(album: AlbumInfo, songs: Song[], source: 'musicbrainz' | 'manual') {
    setSaving(true)
    setSaveError(null)
    try {
      const current = buildCurrentAlbum(album, songs, settings.myLogin, source)
      await writeCurrentAlbum(settings.pat, settings.repoOwner, settings.repoName, current)
      onAlbumPicked(current)
      setPicking(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save album')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  if (albumError) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <ErrorBanner message={albumError} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {currentAlbum ? (
        <div className="space-y-6">
          {/* Current album card */}
          <div className="flex gap-5 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            {currentAlbum.album.coverArtUrl ? (
              <img
                src={currentAlbum.album.coverArtUrl}
                alt={currentAlbum.album.title}
                className="h-28 w-28 rounded-lg object-cover shrink-0"
                onError={(e) => { e.currentTarget.hidden = true }}
              />
            ) : (
              <div className="h-28 w-28 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Disc3 className="h-12 w-12 text-indigo-300" />
              </div>
            )}
            <div className="flex-1 min-w-0 py-1">
              <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
                Now Listening
              </div>
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {currentAlbum.album.title}
              </h2>
              <p className="text-gray-600">
                {currentAlbum.album.artist}
                {currentAlbum.album.releaseYear ? ` · ${currentAlbum.album.releaseYear}` : ''}
              </p>
              {currentAlbum.album.genre && (
                <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                  {currentAlbum.album.genre}
                </span>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {currentAlbum.songs.length} tracks
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              onClick={() => navigate('/album')}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <Star className="h-6 w-6 text-indigo-500" />
              <span className="text-sm font-medium text-gray-700">Tag Songs</span>
            </button>
            <button
              onClick={() => navigate('/discuss')}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <MessageSquare className="h-6 w-6 text-indigo-500" />
              <span className="text-sm font-medium text-gray-700">Discuss</span>
            </button>
            <button
              onClick={() => navigate('/wishlist')}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <ListMusic className="h-6 w-6 text-indigo-500" />
              <span className="text-sm font-medium text-gray-700">Wishlist</span>
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            {confirmingPick ? (
              <div className="space-y-3">
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <strong>{currentAlbum.album.title}</strong> by {currentAlbum.album.artist} hasn't been discussed yet. Are you sure you want to pick a new album?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setConfirmingPick(false); setPicking(true) }}>
                    Yes, pick a new album
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingPick(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={handlePickDifferent} disabled={checkingDiscussion}>
                {checkingDiscussion ? 'Checking...' : 'Pick a different album'}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Disc3 className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">No album selected</h2>
            <p className="text-gray-500 mt-1">Pick an album to get started.</p>
          </div>
          <Button onClick={() => setPicking(true)} className="w-full">
            Pick an Album
          </Button>
        </div>
      )}

      {picking && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Search for an Album</h3>
          {saveError && <ErrorBanner message={saveError} />}
          {saving ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner size="sm" /> Saving...
            </div>
          ) : (
            <AlbumSearch onSelect={handleAlbumSelected} />
          )}
          <Button variant="ghost" size="sm" onClick={() => setPicking(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
