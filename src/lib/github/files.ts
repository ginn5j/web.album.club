import { getOctokit, getGraphql } from './client'

// HEAD OID cache per branch
const headOidCache = new Map<string, string>()

function encodeContent(content: string): string {
  return btoa(unescape(encodeURIComponent(content)))
}

export interface FileAddition {
  path: string
  content: string
}

const CREATE_COMMIT_MUTATION = `
  mutation CreateCommit($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) {
      commit { oid }
    }
  }
`

async function getBranchHeadOid(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  const cached = headOidCache.get(`${owner}/${repo}/${branch}`)
  if (cached) return cached

  const octokit = getOctokit(pat)
  try {
    const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch })
    const oid = data.commit.sha
    headOidCache.set(`${owner}/${repo}/${branch}`, oid)
    return oid
  } catch (err: unknown) {
    const e = err as { status?: number }
    if (e?.status !== 404 || branch === 'main') throw err

    // Branch doesn't exist — create it from main
    const { data: mainData } = await octokit.rest.repos.getBranch({ owner, repo, branch: 'main' })
    const mainSha = mainData.commit.sha
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: mainSha,
    })
    headOidCache.set(`${owner}/${repo}/${branch}`, mainSha)
    return mainSha
  }
}

export async function commitFiles(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  message: string,
  files: FileAddition[],
): Promise<string> {
  const gql = getGraphql(pat)
  const expectedHeadOid = await getBranchHeadOid(pat, owner, repo, branch)

  const additions = files.map((f) => ({
    path: f.path,
    contents: encodeContent(f.content),
  }))

  try {
    const result = await gql<{
      createCommitOnBranch: { commit: { oid: string } }
    }>(CREATE_COMMIT_MUTATION, {
      input: {
        branch: { repositoryNameWithOwner: `${owner}/${repo}`, branchName: branch },
        message: { headline: message },
        fileChanges: { additions },
        expectedHeadOid,
      },
    })

    const newOid = result.createCommitOnBranch.commit.oid
    headOidCache.set(`${owner}/${repo}/${branch}`, newOid)
    return newOid
  } catch {
    // On conflict, clear cache and retry once
    headOidCache.delete(`${owner}/${repo}/${branch}`)
    const retryOid = await getBranchHeadOid(pat, owner, repo, branch)
    const result = await gql<{
      createCommitOnBranch: { commit: { oid: string } }
    }>(CREATE_COMMIT_MUTATION, {
      input: {
        branch: { repositoryNameWithOwner: `${owner}/${repo}`, branchName: branch },
        message: { headline: message },
        fileChanges: { additions },
        expectedHeadOid: retryOid,
      },
    })
    const newOid = result.createCommitOnBranch.commit.oid
    headOidCache.set(`${owner}/${repo}/${branch}`, newOid)
    return newOid
  }
}

// Write a single file to an external repo (for Jekyll publishing)
export async function commitFileToRepo(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  message: string,
  content: string,
): Promise<void> {
  await commitFiles(pat, owner, repo, branch, message, [{ path, content }])
}
