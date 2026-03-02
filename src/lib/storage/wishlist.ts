import { readFile, commitFiles } from '../github/files'
import { WISHLIST_PATH } from '../../constants/config'
import type { WishlistFile } from '../../types/wishlist'

export async function readWishlist(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<WishlistFile | null> {
  const result = await readFile(pat, owner, repo, branch, WISHLIST_PATH)
  if (!result) return null
  return JSON.parse(result.content) as WishlistFile
}

export async function writeWishlist(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  wishlist: WishlistFile,
): Promise<void> {
  await commitFiles(
    pat,
    owner,
    repo,
    branch,
    'Update wishlist',
    [{ path: WISHLIST_PATH, content: JSON.stringify(wishlist, null, 2) }],
  )
}
