import { readFile, commitFiles } from '../github/files'
import { tagsPath } from '../../constants/config'
import type { TagsFile, TagValue } from '../../types/discussion'

export async function readTags(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  albumId: string,
): Promise<TagsFile | null> {
  const result = await readFile(pat, owner, repo, branch, tagsPath(albumId))
  if (!result) return null
  return JSON.parse(result.content) as TagsFile
}

export async function writeTags(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  albumId: string,
  tags: Record<string, TagValue>,
): Promise<void> {
  const file: TagsFile = {
    albumId,
    updatedAt: new Date().toISOString(),
    tags,
  }
  await commitFiles(
    pat,
    owner,
    repo,
    branch,
    'Update song tags',
    [{ path: tagsPath(albumId), content: JSON.stringify(file, null, 2) }],
  )
}
