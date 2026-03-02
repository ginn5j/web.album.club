import { useMemo } from 'react'
import { getOctokit } from '../lib/github/client'
import type { Octokit } from '@octokit/rest'

export function useOctokit(pat: string | undefined): Octokit | null {
  return useMemo(() => {
    if (!pat) return null
    return getOctokit(pat)
  }, [pat])
}
