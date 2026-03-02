import { readFile, commitFiles } from '../github/files'
import { notesPath } from '../../constants/config'
import type { NotesFile } from '../../types/discussion'

export async function readNotes(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  albumId: string,
): Promise<NotesFile | null> {
  const result = await readFile(pat, owner, repo, branch, notesPath(albumId))
  if (!result) return null
  return JSON.parse(result.content) as NotesFile
}

export async function writeNotes(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  albumId: string,
  notes: string,
): Promise<void> {
  const file: NotesFile = {
    albumId,
    updatedAt: new Date().toISOString(),
    notes,
  }
  await commitFiles(
    pat,
    owner,
    repo,
    branch,
    'Update notes',
    [{ path: notesPath(albumId), content: JSON.stringify(file, null, 2) }],
  )
}
