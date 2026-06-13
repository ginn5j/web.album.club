import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Member } from '../../types/member'

// Kept separate from AuthContext.tsx so that file only exports the provider
// component — mixing component and non-component exports breaks Vite's fast
// refresh (react-refresh/only-export-components).

export interface AuthState {
  session: Session | null
  member: Member | null
  // Set when the member lookup itself failed. Callers must not treat a null
  // member as "not a member yet" while this is set — a transient error would
  // otherwise send an existing member back through onboarding.
  memberError: string | null
  loading: boolean
  signOut: () => Promise<void>
  refreshMember: () => Promise<void>
}

export const AuthContext = createContext<AuthState>({
  session: null,
  member: null,
  memberError: null,
  loading: true,
  signOut: async () => {},
  refreshMember: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}
