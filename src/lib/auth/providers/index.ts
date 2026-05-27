import { emailMagicLinkProvider } from './emailMagicLink'
import type { AuthProviderConfig } from '../types'

export const AUTH_PROVIDERS: AuthProviderConfig[] = [emailMagicLinkProvider]
