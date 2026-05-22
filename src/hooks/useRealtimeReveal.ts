import { useState, useEffect, useCallback } from 'react'
import { backend } from '../lib/backends'

export interface RevealState {
  revealed: boolean
  revealedByUserId: string | null
  revealedAt: string | null
}

export interface RevealStateResult extends RevealState {
  markRevealed: (userId: string, revealedAt: string) => void
  error: string | null
}

export function useRealtimeReveal(albumId: string | null): RevealStateResult {
  const [state, setState] = useState<RevealState>({
    revealed: false,
    revealedByUserId: null,
    revealedAt: null,
  })
  const [error, setError] = useState<string | null>(null)

  // Reset when album changes
  useEffect(() => {
    setState({ revealed: false, revealedByUserId: null, revealedAt: null })
    setError(null)
  }, [albumId])

  // Check if already revealed on mount / album change
  useEffect(() => {
    if (!albumId) return
    backend.storage
      .getRevealForAlbum(albumId)
      .then((reveal) => {
        if (reveal) setState({ revealed: true, revealedByUserId: reveal.userId, revealedAt: reveal.revealedAt })
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to check reveal'))
  }, [albumId])

  // Realtime subscription — fires when any member reveals
  useEffect(() => {
    if (!albumId || state.revealed) return
    const unsubscribe = backend.realtime.subscribeToReveals(albumId, (reveal) => {
      setState({ revealed: true, revealedByUserId: reveal.userId, revealedAt: reveal.revealedAt })
    })
    return unsubscribe
  }, [albumId, state.revealed])

  const markRevealed = useCallback((userId: string, revealedAt: string) => {
    setError(null)
    setState({ revealed: true, revealedByUserId: userId, revealedAt })
  }, [])

  return { ...state, markRevealed, error }
}
