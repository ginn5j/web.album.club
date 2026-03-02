import { readFile, commitFiles, clearEtagCache } from '../github/files'
import { REVEAL_PATH } from '../../constants/config'
import type { RevealFile } from '../../types/discussion'

export async function readReveal(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  useEtag = false,
): Promise<RevealFile | null> {
  const result = await readFile(pat, owner, repo, branch, REVEAL_PATH, useEtag)
  if (!result) return null
  return JSON.parse(result.content) as RevealFile
}

export async function writeReveal(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  albumId: string,
): Promise<void> {
  const file: RevealFile = {
    albumId,
    revealedAt: new Date().toISOString(),
  }
  await commitFiles(
    pat,
    owner,
    repo,
    branch,
    'Reveal discussion',
    [{ path: REVEAL_PATH, content: JSON.stringify(file, null, 2) }],
  )
  // Clear ETag so the next readReveal fetches the new file rather than getting a stale 304
  clearEtagCache(owner, repo, branch, REVEAL_PATH)
}
