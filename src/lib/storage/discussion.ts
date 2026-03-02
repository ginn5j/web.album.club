import { readFile, commitFiles } from '../github/files'
import { MAIN_BRANCH, discussionPath, DISCUSSIONS_DIR } from '../../constants/config'
import type { DiscussionData } from '../../types/discussion'
import type { MemberSettings } from '../../types/member'

export async function readDiscussion(
  pat: string,
  owner: string,
  repo: string,
  albumId: string,
): Promise<DiscussionData | null> {
  const result = await readFile(pat, owner, repo, MAIN_BRANCH, discussionPath(albumId))
  if (!result) return null
  return JSON.parse(result.content) as DiscussionData
}

export async function writeDiscussion(
  pat: string,
  owner: string,
  repo: string,
  discussion: DiscussionData,
): Promise<void> {
  await commitFiles(
    pat,
    owner,
    repo,
    MAIN_BRANCH,
    `Discussion: ${discussion.album.title} by ${discussion.album.artist}`,
    [{ path: discussionPath(discussion.albumId), content: JSON.stringify(discussion, null, 2) }],
  )
}

export async function listDiscussions(
  pat: string,
  owner: string,
  repo: string,
): Promise<string[]> {
  const { getOctokit } = await import('../github/client')
  const octokit = getOctokit(pat)
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: DISCUSSIONS_DIR,
      ref: MAIN_BRANCH,
    })
    if (!Array.isArray(data)) return []
    return data
      .filter((f) => f.name.endsWith('.json'))
      .map((f) => f.name.replace(/\.json$/, ''))
  } catch {
    return []
  }
}

export async function readMemberSettings(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<MemberSettings | null> {
  const result = await readFile(pat, owner, repo, branch, 'settings.json')
  if (!result) return null
  return JSON.parse(result.content) as MemberSettings
}

export async function writeMemberSettings(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  settings: object,
): Promise<void> {
  await commitFiles(
    pat,
    owner,
    repo,
    branch,
    'Update settings',
    [{ path: 'settings.json', content: JSON.stringify(settings, null, 2) }],
  )
}
