import { useState } from 'react'
import { Upload, ExternalLink } from 'lucide-react'
import { Button } from './ui/Button'
import { generateJekyllPost, generateJekyllFilename } from '../lib/merge/jekyll'
import { commitFileToRepo } from '../lib/github/files'
import type { DiscussionData } from '../types/discussion'
import type { MemberSettings } from '../types/member'
import type { LocalSettings } from '../lib/settings'

interface PublishButtonProps {
  discussion: DiscussionData
  memberSettings: MemberSettings | null
  localSettings: LocalSettings
}

export function PublishButton({ discussion, memberSettings, localSettings }: PublishButtonProps) {
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!memberSettings?.output) {
    return (
      <p className="text-sm text-gray-500">
        Configure your output repo in Settings to publish discussions.
      </p>
    )
  }

  const { output } = memberSettings

  async function handlePublish() {
    if (!memberSettings?.output) return
    setPublishing(true)
    setError(null)
    try {
      const post = generateJekyllPost(discussion)
      const path = generateJekyllFilename(discussion, output.postsPath)
      await commitFileToRepo(
        localSettings.publishPat ?? localSettings.pat,
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
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        onClick={handlePublish}
        disabled={publishing}
      >
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
  )
}
