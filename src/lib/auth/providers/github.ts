import { supabase } from '../../backends/supabase/client'
import type { AuthProviderConfig } from '../types'

export const githubProvider: AuthProviderConfig = {
  id: 'github',
  label: 'Continue with GitHub',
  type: 'oauth',
  signIn: () =>
    supabase.auth
      .signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'read:user',
          redirectTo: `${location.origin}${import.meta.env.VITE_BASE_URL ?? '/'}`,
        },
      })
      .then(() => {}),
  getSuggestedDisplayName: (meta) => meta.user_name as string | undefined,
}
