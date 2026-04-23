import { useState, useRef } from 'react'
import { Plus, ListMusic } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { AlbumSearch } from '../components/AlbumSearch'
import { WishlistItem as WishlistItemComponent } from '../components/WishlistItem'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { Spinner } from '../components/ui/Spinner'
import { useWishlist } from '../hooks/useWishlist'
import { writeCurrentAlbum } from '../lib/storage/album'
import { readDiscussion } from '../lib/storage/discussion'
import { buildCurrentAlbum, lookupRelease } from '../lib/musicbrainz/lookup'
import type { CurrentAlbum, AlbumInfo, Song } from '../types/album'
import type { WishlistItem } from '../types/wishlist'
import type { LocalSettings } from '../lib/settings'

interface WishlistPageProps {
  settings: LocalSettings
  currentAlbum?: CurrentAlbum | null
  onAlbumPicked?: () => void
}

export function WishlistPage({ settings, currentAlbum, onAlbumPicked }: WishlistPageProps) {
  const { items, loading, error, addItem, removeItem, updateItem, reorderItems } = useWishlist(
    settings,
    settings.myLogin,
  )

  const [adding, setAdding] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragEnabled = useRef(false)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [promoteError, setPromoteError] = useState<string | null>(null)
  const [confirmingPromote, setConfirmingPromote] = useState<WishlistItem | null>(null)
  const [checkingId, setCheckingId] = useState<string | null>(null)

  function handleSelect(album: AlbumInfo, _songs: Song[], source: 'musicbrainz' | 'manual') {
    const item: WishlistItem = {
      id: album.mbid ?? `${Date.now()}`,
      addedAt: new Date().toISOString(),
      album,
      source,
    }
    addItem(item)
    setAdding(false)
  }

  async function handlePromote(item: WishlistItem) {
    if (currentAlbum) {
      setCheckingId(item.id)
      try {
        const discussion = await readDiscussion(settings.pat, settings.repoOwner, settings.repoName, currentAlbum.id)
        if (!discussion) {
          setConfirmingPromote(item)
          return
        }
      } catch {
        // proceed
      } finally {
        setCheckingId(null)
      }
    }
    await doPromote(item)
  }

  async function doPromote(item: WishlistItem) {
    setPromotingId(item.id)
    setPromoteError(null)
    try {
      let album = item.album
      let songs: Song[] = []
      if (item.source === 'musicbrainz' && album.mbid) {
        const data = await lookupRelease(album.mbid)
        album = data.album
        songs = data.songs
      }
      const current = buildCurrentAlbum(album, songs, settings.myLogin, item.source)
      await writeCurrentAlbum(settings.pat, settings.repoOwner, settings.repoName, current)
      onAlbumPicked?.()
    } catch (e) {
      setPromoteError(e instanceof Error ? e.message : 'Failed to pick album')
    } finally {
      setPromotingId(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Wishlist</h1>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4" />
          Add Album
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}
      {promoteError && <ErrorBanner message={promoteError} />}

      {confirmingPromote && currentAlbum && (
        <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-700">
            <strong>{currentAlbum.album.title}</strong> by {currentAlbum.album.artist} hasn't been discussed yet. Are you sure you want to pick <strong>{confirmingPromote.album.title}</strong> instead?
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { const item = confirmingPromote; setConfirmingPromote(null); doPromote(item) }}>
              Yes, pick it
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingPromote(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {adding && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Add to Wishlist</h3>
          <AlbumSearch onSelect={handleSelect} />
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ListMusic className="mx-auto h-12 w-12 mb-3" />
          <p>Your wishlist is empty.</p>
          <p className="text-sm mt-1">Add albums you want the club to listen to.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`relative${overIndex === idx && dragIndex !== idx ? ' ring-2 ring-indigo-400 rounded-lg' : ''}`}
              draggable
              onDragStart={(e) => {
                if (!dragEnabled.current) { e.preventDefault(); return }
                setDragIndex(idx)
              }}
              onDragOver={(e) => { e.preventDefault(); setOverIndex(idx) }}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== idx) reorderItems(dragIndex, idx)
                setDragIndex(null)
                setOverIndex(null)
              }}
              onDragEnd={() => {
                dragEnabled.current = false
                setDragIndex(null)
                setOverIndex(null)
              }}
            >
              {(promotingId === item.id || checkingId === item.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg z-10">
                  <Spinner />
                </div>
              )}
              <WishlistItemComponent
                item={item}
                onRemove={removeItem}
                onPromote={handlePromote}
                onUpdateNote={updateItem}
                isDragging={dragIndex === idx}
                onDragHandleMouseDown={() => { dragEnabled.current = true }}
                onMoveUp={idx > 0 ? () => reorderItems(idx, idx - 1) : undefined}
                onMoveDown={idx < items.length - 1 ? () => reorderItems(idx, idx + 1) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
