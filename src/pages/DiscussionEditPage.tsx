import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { AlbumSearch } from '../components/AlbumSearch'
import { backend } from '../lib/backends'
import type { DiscussionData, MemberDiscussionData, TagValue } from '../types/discussion'
import type { AlbumInfo, Song } from '../types/album'
import type { Member } from '../types/member'

const TAG_OPTIONS: TagValue[] = ['Starter', 'Bench', 'Cut']

export function DiscussionEditPage() {
  const { albumId } = useParams<{ albumId: string }>()
  const isNew = albumId === 'new' || !albumId
  const navigate = useNavigate()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [album, setAlbum] = useState<AlbumInfo | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [pickedBy, setPickedBy] = useState('')
  const [discussedAt, setDiscussedAt] = useState(new Date().toISOString().slice(0, 10))
  const [memberData, setMemberData] = useState<Record<string, MemberDiscussionData>>({})

  useEffect(() => {
    backend.storage.getMembers().then(setMembers).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isNew) return
    const init: Record<string, MemberDiscussionData> = {}
    for (const m of members) {
      init[m.displayName] = { name: m.displayName, tags: {}, notes: '' }
    }
    setMemberData(init)
  }, [isNew, members])

  useEffect(() => {
    if (isNew) return
    backend.storage
      .getDiscussion(albumId!)
      .then((d) => {
        if (d) {
          setAlbum(d.album)
          setSongs(d.songs)
          setPickedBy(d.pickedBy)
          setDiscussedAt(d.discussedAt.slice(0, 10))
          setMemberData(d.members)
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load discussion'))
      .finally(() => setLoading(false))
  }, [albumId, isNew])

  function handleAlbumSelected(a: AlbumInfo, s: Song[]) {
    setAlbum(a)
    setSongs(s)
  }

  function setMemberTag(displayName: string, position: number, tag: TagValue | '') {
    setMemberData((prev) => {
      const next = { ...prev }
      const m = { ...next[displayName] }
      if (tag === '') {
        const tags = { ...m.tags }
        delete tags[String(position)]
        m.tags = tags
      } else {
        m.tags = { ...m.tags, [String(position)]: tag }
      }
      next[displayName] = m
      return next
    })
  }

  function setMemberNotes(displayName: string, notes: string) {
    setMemberData((prev) => ({
      ...prev,
      [displayName]: { ...prev[displayName], notes },
    }))
  }

  async function handleSave() {
    if (!album) return
    setSaving(true)
    setError(null)

    const id = album.mbid ?? albumId ?? `${Date.now()}`

    const discussion: DiscussionData = {
      schemaVersion: 1,
      albumId: isNew ? id : albumId!,
      album,
      songs,
      pickedBy,
      discussedAt: new Date(`${discussedAt}T12:00:00Z`).toISOString(),
      members: memberData,
    }

    try {
      await backend.storage.upsertDiscussion(discussion)
      navigate('/discussions')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save discussion')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/discussions')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">
          {isNew ? 'Add Past Discussion' : 'Edit Discussion'}
        </h1>
      </div>

      {error && <ErrorBanner message={error} />}

      {!album ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">Album</h3>
          <AlbumSearch onSelect={handleAlbumSelected} />
        </div>
      ) : (
        <div className="flex gap-3 items-center bg-gray-50 rounded-lg p-3">
          {album.coverArtUrl && (
            <img src={album.coverArtUrl} alt={album.title} className="h-12 w-12 rounded object-cover shrink-0" onError={(e) => { e.currentTarget.hidden = true }} />
          )}
          <div>
            <div className="font-medium text-gray-900">{album.title}</div>
            <div className="text-sm text-gray-500">{album.artist}</div>
          </div>
        </div>
      )}

      {album && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Discussion Date</label>
              <input
                type="date"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={discussedAt}
                onChange={(e) => setDiscussedAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Picked by</label>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={pickedBy}
                onChange={(e) => setPickedBy(e.target.value)}
              >
                <option value="">— select —</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.displayName}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {Object.entries(memberData).map(([displayName, mData]) => (
            <div key={displayName} className="space-y-3 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900">{mData.name}</h3>
              <div className="space-y-1">
                {songs.map((song) => (
                  <div key={song.position} className="flex items-center gap-3">
                    <span className="w-5 text-right text-xs text-gray-400 shrink-0">
                      {song.position}
                    </span>
                    <span className="flex-1 text-sm text-gray-800 truncate">{song.title}</span>
                    <select
                      className="text-xs rounded border border-gray-200 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={mData.tags[String(song.position)] ?? ''}
                      onChange={(e) =>
                        setMemberTag(displayName, song.position, e.target.value as TagValue | '')
                      }
                    >
                      <option value="">—</option>
                      {TAG_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Notes</label>
                <textarea
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  rows={3}
                  value={mData.notes}
                  onChange={(e) => setMemberNotes(displayName, e.target.value)}
                  placeholder={`${mData.name}'s notes...`}
                />
              </div>
            </div>
          ))}

          <Button onClick={handleSave} disabled={saving || !pickedBy} size="lg">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Discussion'}
          </Button>
        </>
      )}
    </div>
  )
}
