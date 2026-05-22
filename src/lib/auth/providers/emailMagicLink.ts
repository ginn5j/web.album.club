import { supabase } from '../../backends/supabase/client'
import type { AuthProviderConfig } from '../types'

export const emailMagicLinkProvider: AuthProviderConfig = {
  id: 'email',
  label: 'Sign in with Email',
  type: 'magiclink',
  signIn: async (email) => {
    if (!email) throw new Error('Email is required')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}${import.meta.env.VITE_BASE_URL ?? '/'}`,
      },
    })
    if (error) throw error
  },
}
