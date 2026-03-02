import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { AlbumSearch } from '../components/AlbumSearch'
import { readDiscussion, writeDiscussion } from '../lib/storage/discussion'
import type { DiscussionData, MemberDiscussionData, TagValue } from '../types/discussion'
import type { AlbumInfo, Song } from '../types/album'
import type { Member } from '../types/member'
import type { LocalSettings } from '../lib/settings'

const TAG_OPTIONS: TagValue[] = ['Starter', 'Bench', 'Cut']

interface DiscussionEditPageProps {
  settings: LocalSettings
  members: Member[]
}

export function DiscussionEditPage({ settings, members }: DiscussionEditPageProps) {
  const { albumId } = useParams<{ albumId: string }>()
  const isNew = albumId === 'new' || !albumId
  const navigate = useNavigate()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [album, setAlbum] = useState<AlbumInfo | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [pickedBy, setPickedBy] = useState('')
  const [discussedAt, setDiscussedAt] = useState(new Date().toISOString().slice(0, 10))
  const [memberData, setMemberData] = useState<Record<string, MemberDiscussionData>>({})

  // For new entries: initialize member rows whenever the members list arrives
  useEffect(() => {
    if (!isNew) return
    const init: Record<string, MemberDiscussionData> = {}
    for (const m of members) {
      init[m.login] = { name: m.name, tags: {}, notes: '' }
    }
    setMemberData(init)
  }, [isNew, members])

  // For existing entries: load the discussion once from the API
  useEffect(() => {
    if (isNew) return
    async function load() {
      try {
        const d = await readDiscussion(settings.pat, settings.repoOwner, settings.repoName, albumId!)
        if (d) {
          setAlbum(d.album)
          setSongs(d.songs)
          setPickedBy(d.pickedBy)
          setDiscussedAt(d.discussedAt.slice(0, 10))
          setMemberData(d.members)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load discussion')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [albumId, isNew, settings])

  function handleAlbumSelected(a: AlbumInfo, s: Song[]) {
    setAlbum(a)
    setSongs(s)
  }

  function setMemberTag(login: string, position: number, tag: TagValue | '') {
    setMemberData((prev) => {
      const next = { ...prev }
      const member = { ...next[login] }
      if (tag === '') {
        const tags = { ...member.tags }
        delete tags[String(position)]
        member.tags = tags
      } else {
        member.tags = { ...member.tags, [String(position)]: tag }
      }
      next[login] = member
      return next
    })
  }

  function setMemberNotes(login: string, notes: string) {
    setMemberData((prev) => ({
      ...prev,
      [login]: { ...prev[login], notes },
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
      await writeDiscussion(settings.pat, settings.repoOwner, settings.repoName, discussion)
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

      {/* Album selection (new only or show readonly) */}
      {isNew || !album ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">Album</h3>
          <AlbumSearch onSelect={handleAlbumSelected} />
        </div>
      ) : (
        <div className="flex gap-3 items-center bg-gray-50 rounded-lg p-3">
          {album.coverArtUrl && (
            <img src={album.coverArtUrl} alt={album.title} className="h-12 w-12 rounded object-cover shrink-0" />
          )}
          <div>
            <div className="font-medium text-gray-900">{album.title}</div>
            <div className="text-sm text-gray-500">{album.artist}</div>
          </div>
        </div>
      )}

      {album && (
        <>
          {/* Metadata */}
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
                  <option key={m.login} value={m.login}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Per-member entry */}
          {Object.entries(memberData).map(([login, mData]) => (
            <div key={login} className="space-y-3 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900">{mData.name}</h3>

              {/* Tags per song */}
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
                        setMemberTag(login, song.position, e.target.value as TagValue | '')
                      }
                    >
                      <option value="">—</option>
                      {TAG_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Notes</label>
                <textarea
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  rows={3}
                  value={mData.notes}
                  onChange={(e) => setMemberNotes(login, e.target.value)}
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
