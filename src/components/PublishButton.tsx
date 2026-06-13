import { useState, useEffect } from 'react'
import { Upload, ExternalLink } from 'lucide-react'
import { Button } from './ui/Button'
import { generateJekyllPost, generateJekyllFilename } from '../lib/merge/jekyll'
import { commitFileToRepo } from '../lib/github/files'
import { backend } from '../lib/backends'
import { useAuth } from '../lib/auth/useAuth'
import type { DiscussionData } from '../types/discussion'
import type { MemberSettingsData } from '../lib/backends/types'

interface PublishButtonProps {
  discussion: DiscussionData
}

// The Jekyll filename and permalink are built by slicing fixed positions out
// of this string, so it must start with a full YYYY-MM-DDTHH:MM:SS timestamp.
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

export function PublishButton({ discussion }: PublishButtonProps) {
  const { member } = useAuth()
  const [memberSettings, setMemberSettings] = useState<MemberSettingsData | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString())

  useEffect(() => {
    if (!member?.userId) return
    backend.storage
      .getMemberSettings(member.userId)
      .then(setMemberSettings)
      .catch(() => {})
  }, [member?.userId])

  if (!memberSettings?.output || !memberSettings.publishPat) {
    return (
      <p className="text-sm text-gray-500">
        Configure your output repo and publish PAT in Settings to publish discussions.
      </p>
    )
  }

  const { output } = memberSettings

  async function handlePublish() {
    if (!memberSettings?.output || !memberSettings.publishPat) return
    if (!ISO_TIMESTAMP_RE.test(publishDate) || Number.isNaN(Date.parse(publishDate))) {
      setError('Publish date must be an ISO timestamp like 2026-06-12T09:00:00Z')
      return
    }
    setPublishing(true)
    setError(null)
    try {
      const post = generateJekyllPost(discussion, publishDate, output.template)
      const path = generateJekyllFilename(discussion, output.postsPath, publishDate)
      await commitFileToRepo(
        memberSettings.publishPat,
        output.owner,
        output.repo,
        output.branch,
        path,
        `Publish discussion: ${discussion.album.title}`,
        post,
      )
      setPublished(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 whitespace-nowrap">Publish date</label>
        <input
          type="text"
          value={publishDate}
          onChange={(e) => setPublishDate(e.target.value)}
          placeholder="YYYY-MM-DDTHH:MM:SSZ"
          className="text-sm border border-gray-300 rounded px-2 py-1 font-mono w-56"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={handlePublish} disabled={publishing}>
          <Upload className="h-4 w-4" />
          {publishing ? 'Publishing...' : published ? 'Republish' : 'Publish to Blog'}
        </Button>
        {published && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Published to {output.owner}/{output.repo}
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
