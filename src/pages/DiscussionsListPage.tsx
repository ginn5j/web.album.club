import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Edit, Plus } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { listDiscussions, readDiscussion } from '../lib/storage/discussion'
import type { DiscussionData } from '../types/discussion'
import type { LocalSettings } from '../lib/settings'

interface DiscussionsListPageProps {
  settings: LocalSettings
}

export function DiscussionsListPage({ settings }: DiscussionsListPageProps) {
  const navigate = useNavigate()
  const [discussions, setDiscussions] = useState<DiscussionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const ids = await listDiscussions(settings.pat, settings.repoOwner, settings.repoName)

        // Load all discussions in parallel
        const loaded = await Promise.all(
          ids.map((id) =>
            readDiscussion(settings.pat, settings.repoOwner, settings.repoName, id).catch(() => null),
          ),
        )
        setDiscussions(loaded.filter((d): d is DiscussionData => d !== null))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load discussions')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [settings])

  // Sort by discussedAt descending
  const sorted = [...discussions].sort(
    (a, b) => new Date(b.discussedAt).getTime() - new Date(a.discussedAt).getTime(),
  )

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Past Discussions</h1>
        <Button size="sm" onClick={() => navigate('/discussions/new')}>
          <Plus className="h-4 w-4" />
          Add Past Discussion
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="mx-auto h-12 w-12 mb-3" />
          <p>No discussions yet.</p>
          <p className="text-sm mt-1">Complete a reveal or add a back-entry to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((d) => (
            <div key={d.albumId} className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 p-4">
              {d.album.coverArtUrl && (
                <img
                  src={d.album.coverArtUrl}
                  alt={d.album.title}
                  className="h-14 w-14 rounded object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{d.album.title}</div>
                <div className="text-sm text-gray-500">
                  {d.album.artist}
                  {d.album.releaseYear ? ` · ${d.album.releaseYear}` : ''}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(d.discussedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {d.pickedBy && ` · Picked by ${d.members[d.pickedBy]?.name ?? d.pickedBy}`}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/discussions/${d.albumId}`)}
                  title="View"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/discussions/${d.albumId}/edit`)}
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
