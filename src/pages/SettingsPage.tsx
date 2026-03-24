import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Save } from 'lucide-react'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { useSettings } from '../hooks/useSettings'
import { readFile } from '../lib/github/files'
import { writeMemberSettings, readMemberSettings } from '../lib/storage/discussion'
import type { MemberSettings } from '../types/member'

interface SettingsPageProps {
  onSave?: () => void
}

export function SettingsPage({ onSave }: SettingsPageProps) {
  const navigate = useNavigate()
  const { settings, update } = useSettings()

  const [pat, setPat] = useState(settings.pat ?? '')
  const [myLogin, setMyLogin] = useState(settings.myLogin ?? '')
  const [repoOwner, setRepoOwner] = useState(settings.repoOwner ?? '')
  const [repoName, setRepoName] = useState(settings.repoName ?? '')
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [testOk, setTestOk] = useState(false)

  // Output repo fields
  const [outputOwner, setOutputOwner] = useState('')
  const [outputRepo, setOutputRepo] = useState('')
  const [outputPostsPath, setOutputPostsPath] = useState('_posts/albums')
  const [outputBranch, setOutputBranch] = useState('main')
  const [publishPat, setPublishPat] = useState(settings.publishPat ?? '')

  useEffect(() => {
    if (!settings.pat || !settings.repoOwner || !settings.repoName || !settings.myLogin) return
    readMemberSettings(settings.pat, settings.repoOwner, settings.repoName, settings.myLogin)
      .then((ms) => {
        if (!ms?.output) return
        setOutputOwner(ms.output.owner)
        setOutputRepo(ms.output.repo)
        setOutputPostsPath(ms.output.postsPath)
        setOutputBranch(ms.output.branch)
      })
      .catch(() => {})
  }, [settings.pat, settings.repoOwner, settings.repoName, settings.myLogin])
  const [savingOutput, setSavingOutput] = useState(false)
  const [outputError, setOutputError] = useState<string | null>(null)
  const [outputSaved, setOutputSaved] = useState(false)

  async function handleSave() {
    update({ pat, myLogin, repoOwner, repoName })
    onSave?.()
    setTestOk(false)
    setTestError(null)
  }

  async function handleTest() {
    if (!pat || !myLogin || !repoOwner || !repoName) return
    setTesting(true)
    setTestError(null)
    setTestOk(false)
    try {
      // Try reading members.json from main to verify access
      const result = await readFile(pat, repoOwner, repoName, 'main', 'settings/members.json')
      if (result) {
        setTestOk(true)
        update({ pat, myLogin, repoOwner, repoName })
        onSave?.()
      } else {
        setTestError('Could not find settings/members.json on main branch. Is the repo set up?')
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  async function handleSaveOutput() {
    if (!pat || !myLogin || !repoOwner || !repoName) return
    setSavingOutput(true)
    setOutputError(null)
    try {
      const existing = await readMemberSettings(pat, repoOwner, repoName, myLogin)
      const updated: MemberSettings = {
        name: existing?.name ?? myLogin,
        ...(outputOwner && outputRepo
          ? {
              output: {
                owner: outputOwner,
                repo: outputRepo,
                postsPath: outputPostsPath,
                branch: outputBranch,
              },
            }
          : {}),
      }
      await writeMemberSettings(pat, repoOwner, repoName, myLogin, updated)
      update({ publishPat: publishPat || undefined })
      setOutputSaved(true)
      setTimeout(() => setOutputSaved(false), 2000)
    } catch (e) {
      setOutputError(e instanceof Error ? e.message : 'Failed to save output settings')
    } finally {
      setSavingOutput(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your GitHub access and album club repo.
        </p>
      </div>

      {/* PAT Setup Instructions */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-3">
        <p className="font-semibold">How to create your access token</p>

        <div className="space-y-1">
          <p className="font-medium text-blue-900">
            Option A — Fine-grained token{' '}
            <span className="font-normal text-blue-700">(recommended, narrower scope)</span>
          </p>
          <p className="text-blue-700">
            Requires the <code className="bg-blue-100 px-1 rounded">album-club</code> repo to be
            owned by a <strong>GitHub organization</strong> that all members belong to. Fine-grained
            tokens can only access repos owned by the token creator or an org they're a member of.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700 mt-1">
            <li>GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token</li>
            <li>Set <strong>Resource owner</strong> to your shared organization</li>
            <li>Repository access: Only select repositories → <code className="bg-blue-100 px-1 rounded">album-club</code></li>
            <li>Permissions: Contents → Read and write</li>
          </ol>
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium mt-1"
          >
            Open fine-grained token settings <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="border-t border-blue-200 pt-3 space-y-1">
          <p className="font-medium text-blue-900">
            Option B — Classic token{' '}
            <span className="font-normal text-blue-700">(simpler setup, broader scope)</span>
          </p>
          <p className="text-blue-700">
            Works when the repo owner has added you as a collaborator. The token grants{' '}
            <code className="bg-blue-100 px-1 rounded">repo</code> access to all your repos, not
            just this one — keep it safe.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700 mt-1">
            <li>Ask the repo owner to add you as a collaborator (repo Settings → Collaborators)</li>
            <li>GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)</li>
            <li>Generate new token, select the <strong>repo</strong> scope</li>
          </ol>
          <a
            href="https://github.com/settings/tokens/new?scopes=repo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium mt-1"
          >
            Open classic token settings <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="space-y-4">
        <Input
          label="GitHub PAT"
          type="password"
          value={pat}
          onChange={(e) => setPat(e.target.value)}
          placeholder="github_pat_... or ghp_..."
          hint="Fine-grained token (org repo) or classic token with repo scope"
        />
        <Input
          label="Your GitHub login"
          value={myLogin}
          onChange={(e) => setMyLogin(e.target.value)}
          placeholder="alice-github"
        />
        <Input
          label="Repo owner"
          value={repoOwner}
          onChange={(e) => setRepoOwner(e.target.value)}
          placeholder="album-club-org"
        />
        <Input
          label="Repo name"
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
          placeholder="album-club"
        />

        {testError && <ErrorBanner message={testError} />}
        {testOk && (
          <p className="text-sm text-green-600">Connection successful! Settings saved.</p>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button variant="secondary" onClick={handleTest} disabled={testing || !pat || !myLogin || !repoOwner || !repoName}>
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </div>

      {/* Output repo */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
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
          placeholder="alice-github"
        />
        <Input
          label="Blog repo name"
          value={outputRepo}
          onChange={(e) => setOutputRepo(e.target.value)}
          placeholder="alice-github.github.io"
        />
        <Input
          label="Posts path"
          value={outputPostsPath}
          onChange={(e) => setOutputPostsPath(e.target.value)}
          placeholder="_posts/albums"
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
          hint="Only needed if your blog repo is personal and your club token is scoped to an org. Leave blank to reuse your club token (classic PAT users)."
        />
        {outputError && <ErrorBanner message={outputError} />}
        {outputSaved && <p className="text-sm text-green-600">Output settings saved.</p>}
        <Button
          variant="secondary"
          onClick={handleSaveOutput}
          disabled={savingOutput || !pat || !myLogin || !repoOwner || !repoName}
        >
          {savingOutput ? 'Saving...' : 'Save Output Settings'}
        </Button>
      </div>

      {testOk && (
        <Button onClick={() => navigate('/')} variant="primary">
          Go to App
        </Button>
      )}
    </div>
  )
}
