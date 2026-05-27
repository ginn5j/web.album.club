import { useState, type FormEvent } from 'react'
import { Disc3 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { backend } from '../lib/backends'
import { useAuth } from '../lib/auth/AuthContext'

export function OnboardingPage() {
  const { session, refreshMember } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!session || !displayName.trim()) return
    setSaving(true)
    setError(null)
    try {
      await backend.storage.upsertMember({ userId: session.user.id, displayName: displayName.trim() })
      await refreshMember()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <Disc3 className="mx-auto h-12 w-12 text-indigo-600" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Welcome to Album Club</h1>
          <p className="mt-2 text-gray-600">Choose a display name for the club.</p>
        </div>

        {error && <ErrorBanner message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How should we call you?"
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={saving || !displayName.trim()}>
            {saving ? 'Saving...' : 'Join the club'}
          </Button>
        </form>
      </div>
    </div>
  )
}
