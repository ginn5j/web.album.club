import { useState, type FormEvent } from 'react'
import { Disc3 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { emailMagicLinkProvider } from '../lib/auth/providers/emailMagicLink'

export function SignInPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await emailMagicLinkProvider.signIn(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-4 text-center">
          <Disc3 className="mx-auto h-12 w-12 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-600">
            We sent a sign-in link to <strong>{email}</strong>. Click the link to continue.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-sm text-indigo-600 hover:underline"
          >
            Try a different email
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

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label=""
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            required
          />
          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? 'Sending…' : 'Send sign-in link'}
          </Button>
        </form>
      </div>
    </div>
  )
}
