import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../backends/supabase/client'
import { backend } from '../backends'
import type { Member } from '../../types/member'

interface AuthState {
  session: Session | null
  member: Member | null
  loading: boolean
  signOut: () => Promise<void>
  refreshMember: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null,
  member: null,
  loading: true,
  signOut: async () => {},
  refreshMember: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadMember(userId: string) {
    try {
      const m = await backend.storage.getMemberByUserId(userId)
      setMember(m)
    } catch {
      setMember(null)
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
        loadMember(s.user.id)
      } else {
        setMember(null)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, member, loading, signOut, refreshMember }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
