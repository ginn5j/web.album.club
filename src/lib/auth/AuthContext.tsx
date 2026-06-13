import { useState, useEffect, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../backends/supabase/client'
import { backend } from '../backends'
import { AuthContext } from './useAuth'
import type { Member } from '../../types/member'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [memberError, setMemberError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadMember(userId: string) {
    try {
      const m = await backend.storage.getMemberByUserId(userId)
      setMember(m)
      setMemberError(null)
    } catch (e) {
      setMember(null)
      setMemberError(e instanceof Error ? e.message : 'Failed to load membership')
    }
  }

  async function refreshMember() {
    if (session?.user.id) await loadMember(session.user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) {
        loadMember(s.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) {
        // Defer past the callback: supabase-js holds its internal auth lock
        // while this callback runs, and issuing another Supabase call from
        // inside it can deadlock (documented onAuthStateChange caveat).
        setTimeout(() => { void loadMember(s.user.id) }, 0)
      } else {
        setMember(null)
        setMemberError(null)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, member, memberError, loading, signOut, refreshMember }}>
      {children}
    </AuthContext.Provider>
  )
}
