import { useState, useEffect } from 'react'
import { Upload, ExternalLink } from 'lucide-react'
import { Button } from './ui/Button'
import { generateJekyllPost, generateJekyllFilename } from '../lib/merge/jekyll'
import { commitFileToRepo } from '../lib/github/files'
import { readMemberSettings } from '../lib/storage/discussion'
import type { DiscussionData } from '../types/discussion'
import type { MemberSettings } from '../types/member'
import type { LocalSettings } from '../lib/settings'

interface PublishButtonProps {
  discussion: DiscussionData
  localSettings: LocalSettings
}

export function PublishButton({ discussion, localSettings }: PublishButtonProps) {
  const [memberSettings, setMemberSettings] = useState<MemberSettings | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString())

  useEffect(() => {
    readMemberSettings(
      localSettings.pat,
      localSettings.repoOwner,
      localSettings.repoName,
      localSettings.myLogin,
    )
      .then((ms) => setMemberSettings(ms))
      .catch(() => {})
  }, [localSettings.pat, localSettings.repoOwner, localSettings.repoName, localSettings.myLogin])

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
      const post = generateJekyllPost(discussion, publishDate, output.template)
      const path = generateJekyllFilename(discussion, output.postsPath, publishDate)
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
    </div>
  )
}
