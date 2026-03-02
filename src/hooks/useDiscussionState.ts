import { useState, useEffect, useCallback } from 'react'
import { readReveal } from '../lib/storage/reveal'
import { POLL_INTERVAL_MS } from '../constants/config'
import type { Member } from '../types/member'
import type { LocalSettings } from '../lib/settings'

export interface DiscussionState {
  revealed: boolean
  revealedBy: string | null
  revealedAt: string | null
}

export interface DiscussionStateResult extends DiscussionState {
  checkReveal: () => Promise<void>
  markRevealed: (revealedBy: string, revealedAt: string) => void
  checkError: string | null
}

export function useDiscussionState(
  settings: LocalSettings | null,
  members: Member[],
  albumId: string | null,
): DiscussionStateResult {
  const [state, setState] = useState<DiscussionState>({
    revealed: false,
    revealedBy: null,
    revealedAt: null,
  })
  const [checkError, setCheckError] = useState<string | null>(null)

  // Reset revealed state when the album changes so a new album doesn't
  // inherit the previous album's revealed status
  useEffect(() => {
    setState({ revealed: false, revealedBy: null, revealedAt: null })
    setCheckError(null)
  }, [albumId])

  // Derive stable primitive deps instead of depending on the members array object
  const memberBranches = members.map((m) => m.branch).join(',')
  const memberLogins = members.map((m) => m.login).join(',')

  const checkReveal = useCallback(async () => {
    if (!settings || !albumId || members.length === 0) return

    const errors: string[] = []
    for (const member of members) {
      try {
        const reveal = await readReveal(
          settings.pat,
          settings.repoOwner,
          settings.repoName,
          member.branch,
          true,
        )
        if (reveal && reveal.albumId === albumId) {
          setCheckError(null)
          setState({
            revealed: true,
            revealedBy: member.login,
            revealedAt: reveal.revealedAt,
          })
          return
        }
      } catch (e) {
        errors.push(`${member.branch}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    if (errors.length > 0) {
      setCheckError(errors.join('; '))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, albumId, memberBranches, memberLogins])

  // Immediately mark this client as revealed — used by the member who clicks
  // Reveal so they don't have to wait for a read-back from the API
  const markRevealed = useCallback((revealedBy: string, revealedAt: string) => {
    setCheckError(null)
    setState({ revealed: true, revealedBy, revealedAt })
  }, [])

  // Initial check
  useEffect(() => {
    if (state.revealed) return
    checkReveal()
  }, [checkReveal, state.revealed])

  // Poll — stops automatically once revealed
  useEffect(() => {
    if (!settings || !albumId || state.revealed) return
    const interval = setInterval(checkReveal, POLL_INTERVAL_MS)
    const handleVisibility = () => {
      if (!document.hidden) checkReveal()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [settings, albumId, checkReveal, state.revealed])

  return { ...state, checkReveal, markRevealed, checkError }
}
