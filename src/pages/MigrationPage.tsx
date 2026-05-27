import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { backend } from '../lib/backends'
import { useAuth } from '../lib/auth/AuthContext'
import { readFile } from '../lib/github/files'
import { MAIN_BRANCH } from '../constants/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CurrentAlbum } from '../types/album'
import type { DiscussionData } from '../types/discussion'
import type { TagValue } from '../types/discussion'
import type { WishlistItem } from '../types/wishlist'

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
  const [serviceRoleKey, setServiceRoleKey] = useState('')
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

    // Admin client bypasses RLS so we can write data on behalf of any member.
    // The service role key is entered by the admin and sent only to their own
    // Supabase project — it is not stored anywhere.
    const adminClient: SupabaseClient | null = serviceRoleKey
      ? createClient(
          import.meta.env.VITE_SUPABASE_URL as string,
          serviceRoleKey,
          { auth: { persistSession: false, autoRefreshToken: false } },
        )
      : null

    if (!adminClient) {
      log('⚠ Service role key', 'error',
        'Not provided — per-member data (tags, notes, wishlist) will be skipped for other members due to RLS')
    }

    try {
      // Step 1: Current album (written as the logged-in admin — albums RLS allows any member)
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

      // Step 3: Discussions (written as the logged-in admin — discussions RLS allows any member)
      log('Discussions', 'running')
      try {
        const { getOctokit } = await import('../lib/github/client')
        const octokit = getOctokit(pat)
        const { data } = await octokit.rest.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: 'discussions',
          ref: MAIN_BRANCH,
        })
        const files = Array.isArray(data)
          ? data.filter((f: { name: string }) => f.name.endsWith('.json'))
          : []
        let migrated = 0
        for (const file of files) {
          try {
            const discussion = await readGitHubJson<DiscussionData>(`discussions/${file.name}`)
            if (discussion) {
              await backend.storage.upsertDiscussion(discussion)
              migrated++
            }
          } catch { /* skip individual file errors */ }
        }
        log('Discussions', 'done', `${migrated}/${files.length} migrated`)
      } catch (e) {
        log('Discussions', 'error', e instanceof Error ? e.message : String(e))
      }

      // Step 4: Per-member private data
      // Requires the service role key — the anon client can only write rows where
      // user_id = auth.uid(), so writing another member's data is blocked by RLS.
      const supabaseMembers = await backend.storage.getMembers()

      for (const ghMember of githubMembers) {
        // name = display name in Supabase; branch = Git branch for private data (may differ)
        const supabaseMember = supabaseMembers.find(
          (m) => m.displayName === ghMember.name || m.displayName === ghMember.login,
        )

        const prefix = `Member: ${ghMember.name}`

        if (!supabaseMember) {
          const available = supabaseMembers.map((m) => `"${m.displayName}"`).join(', ')
          log(
            prefix,
            'error',
            `No Supabase member matched name="${ghMember.name}" or login="${ghMember.login}". ` +
              `Available display names: ${available || '(none)'}`,
          )
          continue
        }

        const branch = ghMember.branch  // Git branch for this member's private data
        const userId = supabaseMember.userId
        const isSelf = userId === member.userId

        // Without the service role key we can only write our own rows
        if (!adminClient && !isSelf) {
          log(prefix, 'error', `Skipped — service role key required to write data for other members (branch=${branch})`)
          continue
        }

        const writer = adminClient ?? null  // null means use backend.storage (own data only)
        log(prefix, 'running', `branch=${branch}`)

        try {
          const { getOctokit } = await import('../lib/github/client')
          const octokit = getOctokit(pat)

          // Tags
          try {
            const { data } = await octokit.rest.repos.getContent({
              owner: repoOwner, repo: repoName, path: 'tags', ref: branch,
            })
            const tagFiles = Array.isArray(data)
              ? data.filter((f: { name: string }) => f.name.endsWith('.json'))
              : []
            for (const file of tagFiles) {
              try {
                const albumId = file.name.replace(/\.json$/, '')
                const tagsData = await readGitHubJson<{ tags: Record<string, string> }>(`tags/${file.name}`, branch)
                if (tagsData) {
                  if (writer) {
                    await writer.from('tags').upsert(
                      { user_id: userId, album_id: albumId, tags: tagsData.tags, updated_at: new Date().toISOString() },
                      { onConflict: 'user_id,album_id' },
                    )
                  } else {
                    await backend.storage.setTags(userId, albumId, tagsData.tags as Record<string, TagValue>)
                  }
                }
              } catch { /* skip individual file */ }
            }
          } catch { /* tags dir may not exist on this branch */ }

          // Notes
          try {
            const { data } = await octokit.rest.repos.getContent({
              owner: repoOwner, repo: repoName, path: 'notes', ref: branch,
            })
            const noteFiles = Array.isArray(data)
              ? data.filter((f: { name: string }) => f.name.endsWith('.json'))
              : []
            for (const file of noteFiles) {
              try {
                const albumId = file.name.replace(/\.json$/, '')
                const notesData = await readGitHubJson<{ notes: string }>(`notes/${file.name}`, branch)
                if (notesData) {
                  if (writer) {
                    await writer.from('notes').upsert(
                      { user_id: userId, album_id: albumId, content: notesData.notes, updated_at: new Date().toISOString() },
                      { onConflict: 'user_id,album_id' },
                    )
                  } else {
                    await backend.storage.setNotes(userId, albumId, notesData.notes)
                  }
                }
              } catch { /* skip individual file */ }
            }
          } catch { /* notes dir may not exist on this branch */ }

          // Wishlist
          try {
            const wishlist = await readGitHubJson<{ items: unknown[] }>('wishlist.json', branch)
            if (wishlist?.items) {
              if (writer) {
                await writer.from('wishlists').upsert(
                  { user_id: userId, items: wishlist.items, updated_at: new Date().toISOString() },
                  { onConflict: 'user_id' },
                )
              } else {
                await backend.storage.setWishlist(userId, wishlist.items as WishlistItem[])
              }
            }
          } catch { /* wishlist.json may not exist */ }

          // Member settings (blog output config)
          try {
            const ms = await readGitHubJson<{
              output?: { owner: string; repo: string; postsPath: string; branch: string; template?: string }
            }>('settings.json', branch)
            if (ms?.output) {
              if (writer) {
                await writer.from('member_settings').upsert(
                  {
                    user_id: userId,
                    output_owner: ms.output.owner,
                    output_repo: ms.output.repo,
                    output_posts_path: ms.output.postsPath,
                    output_branch: ms.output.branch,
                    output_template: ms.output.template ?? null,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'user_id' },
                )
              } else {
                await backend.storage.setMemberSettings(userId, { output: ms.output })
              }
            }
          } catch { /* settings.json may not exist */ }

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
          <li>
            Each member's Supabase display name must match the <code>name</code> field in members.json.
            The <code>branch</code> field is used separately to read their private data and may differ.
          </li>
          <li>The service role key is required to write private data for other members (bypasses RLS).</li>
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
        <Input
          label="Supabase service role key (required for other members' private data)"
          type="password"
          value={serviceRoleKey}
          onChange={(e) => setServiceRoleKey(e.target.value)}
          placeholder="eyJ... (Project Settings → API → service_role key)"
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
              <span
                className={`shrink-0 font-mono text-xs mt-0.5 ${
                  step.status === 'done'
                    ? 'text-green-600'
                    : step.status === 'error'
                      ? 'text-red-600'
                      : step.status === 'running'
                        ? 'text-indigo-600'
                        : 'text-gray-400'
                }`}
              >
                {step.status === 'done' ? '✓' : step.status === 'error' ? '✗' : step.status === 'running' ? '…' : '·'}
              </span>
              <span className="font-medium text-gray-800">{step.label}</span>
              {step.detail && <span className="text-gray-500 ml-auto text-xs max-w-xs text-right">{step.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
