import { useState, useEffect } from 'react'
import { Save, LogOut, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { backend } from '../lib/backends'
import { useAuth } from '../lib/auth/AuthContext'
import { DEFAULT_TEMPLATE } from '../lib/merge/jekyll'
import type { MemberSettingsData } from '../lib/backends/types'

export function SettingsPage() {
  const { member, session, signOut } = useAuth()
  const userId = member?.userId ?? null

  const [outputOwner, setOutputOwner] = useState('')
  const [outputRepo, setOutputRepo] = useState('')
  const [outputPostsPath, setOutputPostsPath] = useState('_posts/{{year}}/{{month}}')
  const [outputBranch, setOutputBranch] = useState('main')
  const [publishPat, setPublishPat] = useState('')
  const [outputTemplate, setOutputTemplate] = useState('')
  const [showVarsRef, setShowVarsRef] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!userId) return
    backend.storage.getMemberSettings(userId).then((ms) => {
      if (!ms?.output) return
      setOutputOwner(ms.output.owner)
      setOutputRepo(ms.output.repo)
      setOutputPostsPath(ms.output.postsPath)
      setOutputBranch(ms.output.branch)
      setOutputTemplate(ms.output.template ?? '')
      if (ms.publishPat) setPublishPat(ms.publishPat)
    }).catch(() => {})
  }, [userId])

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    setSaveError(null)
    try {
      const settings: MemberSettingsData = {
        publishPat: publishPat || undefined,
        ...(outputOwner && outputRepo ? {
          output: {
            owner: outputOwner,
            repo: outputRepo,
            postsPath: outputPostsPath,
            branch: outputBranch,
            template: outputTemplate || undefined,
          },
        } : {}),
      }
      await backend.storage.setMemberSettings(userId, settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          {member && (
            <p className="text-sm text-gray-500 mt-0.5">
              Signed in as <strong>{member.displayName}</strong>
              {session?.user.email ? ` (${session.user.email})` : ''}
            </p>
          )}
        </div>
        <Button variant="ghost" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      {/* Blog output config */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Blog Output (optional)</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure your Jekyll blog repo to publish discussions.
          </p>
        </div>
        <Input
          label="Blog repo owner"
          value={outputOwner}
          onChange={(e) => setOutputOwner(e.target.value)}
          placeholder="alice"
        />
        <Input
          label="Blog repo name"
          value={outputRepo}
          onChange={(e) => setOutputRepo(e.target.value)}
          placeholder="alice.github.io"
        />
        <Input
          label="Posts path"
          value={outputPostsPath}
          onChange={(e) => setOutputPostsPath(e.target.value)}
          placeholder="_posts/{{year}}/{{month}}"
          hint="Supports variables: {{year}}, {{month}}, {{day}}, {{artist_slug}}, {{title_slug}}. Example: _posts/{{year}}"
        />
        <Input
          label="Branch"
          value={outputBranch}
          onChange={(e) => setOutputBranch(e.target.value)}
          placeholder="main"
        />
        <Input
          label="Publish PAT (optional)"
          type="password"
          value={publishPat}
          onChange={(e) => setPublishPat(e.target.value)}
          placeholder="github_pat_... or ghp_..."
          hint="GitHub PAT for publishing to your blog repo. Required for Jekyll publishing."
        />

        {/* Post template */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Post template</label>
          <textarea
            value={outputTemplate}
            onChange={(e) => setOutputTemplate(e.target.value)}
            rows={12}
            placeholder="Leave blank to use the default template."
            className="w-full font-mono text-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOutputTemplate(DEFAULT_TEMPLATE)}>
              Load default template
            </Button>
            <Button variant="secondary" onClick={() => setOutputTemplate('')}>
              Clear
            </Button>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowVarsRef((v) => !v)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              {showVarsRef ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Available variables
            </button>
            {showVarsRef && (
              <table className="mt-2 text-xs text-gray-700 border-collapse w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-2 py-1 text-left font-mono">Variable</th>
                    <th className="border border-gray-200 px-2 py-1 text-left">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['{{album_title}}', 'Album title'],
                    ['{{artist}}', 'Artist name'],
                    ['{{title}}', '"Album Club: <title> - <artist>"'],
                    ['{{date}}', 'Publish date (ISO timestamp)'],
                    ['{{discussed_date}}', 'Discussion date (YYYY-MM-DD)'],
                    ['{{release_year}}', 'Release year, or empty'],
                    ['{{genre}}', 'Genre, or empty'],
                    ['{{mbid}}', 'MusicBrainz ID, or empty'],
                    ['{{cover_art}}', 'Cover art URL, or empty'],
                    ['{{members_list}}', 'YAML array of member names'],
                    ['{{picked_by}}', "Picker's display name"],
                    ['{{permalink}}', 'Post permalink path'],
                    ['{{song_table}}', 'Song ratings table (Markdown)'],
                    ['{{notes}}', 'Member notes sections (Markdown)'],
                    ['{{discussed_line}}', '"Discussed on <date>. Picked by <name>."'],
                    ['{{tag_legend}}', 'Tag legend text'],
                  ].map(([variable, description]) => (
                    <tr key={variable}>
                      <td className="border border-gray-200 px-2 py-1 font-mono whitespace-nowrap">{variable}</td>
                      <td className="border border-gray-200 px-2 py-1">{description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {saveError && <ErrorBanner message={saveError} />}
        {saved && <p className="text-sm text-green-600">Settings saved.</p>}
        <Button onClick={handleSave} disabled={saving || !userId}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
