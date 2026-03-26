import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit } from 'lucide-react'
import { MergedView } from '../components/MergedView'
import { PublishButton } from '../components/PublishButton'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { readDiscussion } from '../lib/storage/discussion'
import type { DiscussionData } from '../types/discussion'
import type { LocalSettings } from '../lib/settings'

interface DiscussionViewPageProps {
  settings: LocalSettings
}

export function DiscussionViewPage({ settings }: DiscussionViewPageProps) {
  const { albumId } = useParams<{ albumId: string }>()
  const navigate = useNavigate()
  const [discussion, setDiscussion] = useState<DiscussionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!albumId) return
    async function load() {
      try {
        const d = await readDiscussion(settings.pat, settings.repoOwner, settings.repoName, albumId!)
        setDiscussion(d)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load discussion')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [albumId, settings])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <ErrorBanner message={error} />
      </div>
    )
  }

  if (!discussion) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 text-gray-500">
        Discussion not found.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/discussions')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">{discussion.album.title}</h2>
          <p className="text-sm text-gray-500">
            {discussion.album.artist}
            {discussion.album.releaseYear ? ` · ${discussion.album.releaseYear}` : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(`/discussions/${albumId}/edit`)}
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="text-sm text-gray-500">
        Discussed on{' '}
        {new Date(discussion.discussedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        {discussion.pickedBy &&
          ` · Picked by ${discussion.members[discussion.pickedBy]?.name ?? discussion.pickedBy}`}
      </div>

      <MergedView discussion={discussion} />

      <div className="border-t border-gray-200 pt-4">
        <PublishButton
          discussion={discussion}
          localSettings={settings}
        />
      </div>
    </div>
  )
}
