import { useState } from 'react'
import { Disc3 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { AUTH_PROVIDERS } from '../lib/auth/providers'

export function SignInPage() {
  const [emailInput, setEmailInput] = useState('')
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn(providerId: string, input?: string) {
    const provider = AUTH_PROVIDERS.find((p) => p.id === providerId)
    if (!provider) return
    setLoading(providerId)
    setError(null)
    try {
      await provider.signIn(input)
      if (provider.type === 'magiclink') {
        setSentEmail(input ?? '')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(null)
    }
  }

  if (sentEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-4 text-center">
          <Disc3 className="mx-auto h-12 w-12 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-600">
            We sent a sign-in link to <strong>{sentEmail}</strong>. Click the link to continue.
          </p>
          <button
            onClick={() => setSentEmail(null)}
            className="text-sm text-indigo-600 hover:underline"
          >
            Use a different method
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <Disc3 className="mx-auto h-12 w-12 text-indigo-600" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Album Club</h1>
          <p className="mt-2 text-gray-600">Sign in to continue</p>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="space-y-3">
          {AUTH_PROVIDERS.map((provider) =>
            provider.type === 'magiclink' ? (
              <div key={provider.id} className="space-y-2">
                <Input
                  label=""
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                />
                <Button
                  className="w-full"
                  onClick={() => handleSignIn(provider.id, emailInput)}
                  disabled={!!loading || !emailInput}
                >
                  {loading === provider.id ? 'Sending...' : provider.label}
                </Button>
              </div>
            ) : (
              <Button
                key={provider.id}
                className="w-full"
                variant="secondary"
                onClick={() => handleSignIn(provider.id)}
                disabled={!!loading}
              >
                {loading === provider.id ? 'Redirecting...' : provider.label}
              </Button>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
