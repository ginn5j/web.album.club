import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { backend } from '../lib/backends'
import { useAuth } from '../lib/auth/AuthContext'
import { readFile } from '../lib/github/files'
import { MAIN_BRANCH } from '../constants/config'
import type { CurrentAlbum } from '../types/album'
import type { DiscussionData } from '../types/discussion'

interface MigrationStep {
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  detail?: string
}

export function MigrationPage() {
  const { member } = useAuth()

  const [pat, setPat] = useState('')
  const [repoOwner, setRepoOwner] = useState('')
  const [repoName, setRepoName] = useState('')
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<MigrationStep[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)

  if (member?.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center text-gray-500">
        <p>This page is only accessible to admins.</p>
      </div>
    )
  }

  function log(label: string, status: MigrationStep['status'], detail?: string) {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.label === label)
      const step: MigrationStep = { label, status, detail }
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = step
        return next
      }
      return [...prev, step]
    })
  }

  async function readGitHubJson<T>(path: string, ref = MAIN_BRANCH): Promise<T | null> {
    const result = await readFile(pat, repoOwner, repoName, ref, path)
    if (!result) return null
    return JSON.parse(result.content) as T
  }

  async function run() {
    if (!pat || !repoOwner || !repoName) return
    setRunning(true)
    setGlobalError(null)
    setSteps([])

    try {
      // Step 1: Current album
      log('Current album', 'running')
      try {
        const album = await readGitHubJson<CurrentAlbum>('current-album.json')
        if (album) {
          await backend.storage.setCurrentAlbum(album)
          log('Current album', 'done', `${album.album.title} by ${album.album.artist}`)
        } else {
          log('Current album', 'done', 'None found')
        }
      } catch (e) {
        log('Current album', 'error', e instanceof Error ? e.message : String(e))
      }

      // Step 2: Members list
      log('Members list', 'running')
      let githubMembers: Array<{ login: string; name: string; branch: string }> = []
      try {
        const config = await readGitHubJson<{ members: typeof githubMembers }>('settings/members.json')
        githubMembers = config?.members ?? []
        log('Members list', 'done', `${githubMembers.length} members found`)
      } catch (e) {
        log('Members list', 'error', e instanceof Error ? e.message : String(e))
      }

      // Step 3: Discussions
      log('Discussions', 'running')
      try {
        // List all discussion files by trying common IDs from members' data
        // Since we can't list directory without Octokit, read known IDs from album if available
        const { getOctokit } = await import('../lib/github/client')
        const octokit = getOctokit(pat)
        const { data } = await octokit.rest.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: 'discussions',
          ref: MAIN_BRANCH,
        })
        const files = Array.isArray(data) ? data.filter((f: { name: string }) => f.name.endsWith('.json')) : []
        let migrated = 0
        for (const file of files) {
          try {
            const discussion = await readGitHubJson<DiscussionData>(`discussions/${file.name}`)
            if (discussion) {
              await backend.storage.upsertDiscussion(discussion)
              migrated++
            }
          } catch { /* skip */ }
        }
        log('Discussions', 'done', `${migrated}/${files.length} migrated`)
      } catch (e) {
        log('Discussions', 'error', e instanceof Error ? e.message : String(e))
      }

      // Step 4: Per-member private data
      const supabaseMembers = await backend.storage.getMembers()

      for (const ghMember of githubMembers) {
        // Match by name (display name) first, then fall back to login
        const supabaseMember = supabaseMembers.find(
          (m) => m.displayName === ghMember.name || m.displayName === ghMember.login,
        )

        const prefix = `Member: ${ghMember.name}`

        if (!supabaseMember) {
          const available = supabaseMembers.map((m) => `"${m.displayName}"`).join(', ')
          log(prefix, 'error',
            `No Supabase member matched name="${ghMember.name}" or login="${ghMember.login}". ` +
            `Available display names: ${available || '(none)'}`)
          continue
        }

        // branch is the Git branch name for this member's private data — may differ from display name
        const branch = ghMember.branch
        log(prefix, 'running', `branch=${branch}`)
        const userId = supabaseMember.userId

        try {
          // Tags
          try {
            const { getOctokit } = await import('../lib/github/client')
            const octokit = getOctokit(pat)
            const { data } = await octokit.rest.repos.getContent({
              owner: repoOwner,
              repo: repoName,
              path: 'tags',
              ref: branch,
            })
            const tagFiles = Array.isArray(data) ? data.filter((f: { name: string }) => f.name.endsWith('.json')) : []
            for (const file of tagFiles) {
              try {
                const albumId = file.name.replace(/\.json$/, '')
                const tagsData = await readGitHubJson<{ tags: Record<string, string> }>(`tags/${file.name}`, branch)
                if (tagsData) await backend.storage.setTags(userId, albumId, tagsData.tags as Record<string, 'Starter' | 'Bench' | 'Cut'>)
              } catch { /* skip */ }
            }
          } catch { /* tags dir may not exist */ }

          // Notes
          try {
            const { getOctokit } = await import('../lib/github/client')
            const octokit = getOctokit(pat)
            const { data } = await octokit.rest.repos.getContent({
              owner: repoOwner,
              repo: repoName,
              path: 'notes',
              ref: branch,
            })
            const noteFiles = Array.isArray(data) ? data.filter((f: { name: string }) => f.name.endsWith('.json')) : []
            for (const file of noteFiles) {
              try {
                const albumId = file.name.replace(/\.json$/, '')
                const notesData = await readGitHubJson<{ notes: string }>(`notes/${file.name}`, branch)
                if (notesData) await backend.storage.setNotes(userId, albumId, notesData.notes)
              } catch { /* skip */ }
            }
          } catch { /* notes dir may not exist */ }

          // Wishlist
          try {
            const wishlist = await readGitHubJson<{ items: unknown[] }>('wishlist.json', branch)
            if (wishlist?.items) await backend.storage.setWishlist(userId, wishlist.items as Parameters<typeof backend.storage.setWishlist>[1])
          } catch { /* skip */ }

          // Member settings
          try {
            const ms = await readGitHubJson<{ output?: { owner: string; repo: string; postsPath: string; branch: string; template?: string } }>('settings.json', branch)
            if (ms?.output) await backend.storage.setMemberSettings(userId, { output: ms.output })
          } catch { /* skip */ }

          log(prefix, 'done')
        } catch (e) {
          log(prefix, 'error', e instanceof Error ? e.message : String(e))
        }
      }
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Migration failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Migration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Migrate data from the GitHub album-club repo to Supabase. All operations are idempotent — safe to re-run.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
        <p className="font-semibold">Before running:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>All club members must have signed in at least once so their Supabase accounts exist.</li>
          <li>Each member's Supabase display name must match the <code>name</code> field (or <code>login</code>) in members.json. The <code>branch</code> field is used separately to read their private data.</li>
          <li>Use a GitHub PAT with read access to the album-club repo and all member branches.</li>
        </ul>
      </div>

      {globalError && <ErrorBanner message={globalError} />}

      <div className="space-y-4">
        <Input
          label="GitHub PAT (read-only is fine)"
          type="password"
          value={pat}
          onChange={(e) => setPat(e.target.value)}
          placeholder="github_pat_... or ghp_..."
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
        <Button
          onClick={run}
          disabled={running || !pat || !repoOwner || !repoName}
          size="lg"
        >
          {running ? 'Migrating...' : 'Run Migration'}
        </Button>
      </div>

      {steps.length > 0 && (
        <div className="space-y-1">
          {steps.map((step) => (
            <div key={step.label} className="flex items-start gap-3 text-sm py-1 border-b border-gray-100">
              <span className={`shrink-0 font-mono text-xs mt-0.5 ${
                step.status === 'done' ? 'text-green-600' :
                step.status === 'error' ? 'text-red-600' :
                step.status === 'running' ? 'text-indigo-600' :
                'text-gray-400'
              }`}>
                {step.status === 'done' ? '✓' : step.status === 'error' ? '✗' : step.status === 'running' ? '…' : '·'}
              </span>
              <span className="font-medium text-gray-800">{step.label}</span>
              {step.detail && <span className="text-gray-500 ml-auto">{step.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
