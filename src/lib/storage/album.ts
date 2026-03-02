import { readFile, commitFiles } from '../github/files'
import { MAIN_BRANCH, CURRENT_ALBUM_PATH } from '../../constants/config'
import type { CurrentAlbum } from '../../types/album'
import type { MembersConfig } from '../../types/member'

export async function readCurrentAlbum(
  pat: string,
  owner: string,
  repo: string,
  useEtag = false,
): Promise<CurrentAlbum | null> {
  const result = await readFile(pat, owner, repo, MAIN_BRANCH, CURRENT_ALBUM_PATH, useEtag)
  if (!result) return null
  return JSON.parse(result.content) as CurrentAlbum
}

export async function writeCurrentAlbum(
  pat: string,
  owner: string,
  repo: string,
  album: CurrentAlbum,
): Promise<void> {
  await commitFiles(
    pat,
    owner,
    repo,
    MAIN_BRANCH,
    `Pick album: ${album.album.title} by ${album.album.artist}`,
    [{ path: CURRENT_ALBUM_PATH, content: JSON.stringify(album, null, 2) }],
  )
}

export async function readMembers(
  pat: string,
  owner: string,
  repo: string,
): Promise<MembersConfig | null> {
  const result = await readFile(pat, owner, repo, MAIN_BRANCH, 'settings/members.json')
  if (!result) return null
  return JSON.parse(result.content) as MembersConfig
}
