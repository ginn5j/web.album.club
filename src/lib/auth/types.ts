export interface AuthProviderConfig {
  id: string
  label: string
  type: 'oauth' | 'magiclink'
  signIn: (input?: string) => Promise<void>
  getSuggestedDisplayName?: (userMetadata: Record<string, unknown>) => string | undefined
}
