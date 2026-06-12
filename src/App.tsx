import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { Disc3, Star, MessageSquare, ListMusic, BookOpen, Settings, Home, Info } from 'lucide-react'
import { ToastContainer, type ToastMessage } from './components/ui/Toast'
import { Spinner } from './components/ui/Spinner'
import { ErrorBanner } from './components/ui/ErrorBanner'
import { Button } from './components/ui/Button'
import { SettingsPage } from './pages/SettingsPage'
import { HomePage } from './pages/HomePage'
import { AlbumPage } from './pages/AlbumPage'
import { WishlistPage } from './pages/WishlistPage'
import { DiscussionPage } from './pages/DiscussionPage'
import { DiscussionsListPage } from './pages/DiscussionsListPage'
import { DiscussionEditPage } from './pages/DiscussionEditPage'
import { DiscussionViewPage } from './pages/DiscussionViewPage'
import { AboutPage } from './pages/AboutPage'
import { SignInPage } from './pages/SignInPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { useAuth } from './lib/auth/AuthContext'
import { useRealtimeAlbum } from './hooks/useRealtimeAlbum'
import { backend } from './lib/backends'
import type { CurrentAlbum } from './types/album'
import type { Member } from './types/member'

// Shown when the member lookup failed (e.g. network blip on session restore).
// Rendering OnboardingPage here instead would let an existing member "re-join"
// and overwrite their display name.
function MemberLoadError({ message }: { message: string }) {
  const { refreshMember, signOut } = useAuth()
  const [retrying, setRetrying] = useState(false)

  async function handleRetry() {
    setRetrying(true)
    try {
      await refreshMember()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-4">
        <ErrorBanner message={`Couldn't load your membership: ${message}`} />
        <div className="flex gap-2">
          <Button onClick={handleRetry} disabled={retrying}>
            {retrying ? 'Retrying...' : 'Retry'}
          </Button>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}

function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, addToast, dismissToast }
}

export function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toasts, addToast, dismissToast } = useToasts()
  const { session, member, memberError, loading: authLoading } = useAuth()

  const [members, setMembers] = useState<Member[]>([])
  const [membersError, setMembersError] = useState<string | null>(null)

  const handleAlbumChanged = useCallback(
    (album: CurrentAlbum) => {
      addToast(`New album picked: ${album.album.title} by ${album.album.artist}`, 'info')
    },
    [addToast],
  )

  const { currentAlbum, loading: albumLoading, error: albumError, refresh } = useRealtimeAlbum(handleAlbumChanged, !!member)

  const handleAlbumPicked = useCallback(() => {
    refresh()
    navigate('/')
  }, [refresh, navigate])

  // Keyed on userId (not the member object) so token refreshes that produce a
  // new member reference don't refetch the roster.
  const myUserId = member?.userId
  useEffect(() => {
    if (!myUserId) return
    backend.storage
      .getMembers()
      .then(setMembers)
      .catch((e: unknown) => setMembersError(e instanceof Error ? e.message : 'Failed to load members'))
  }, [myUserId])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session) {
    return <SignInPage />
  }

  if (!member) {
    if (memberError) {
      return <MemberLoadError message={memberError} />
    }
    return <OnboardingPage />
  }

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/album', label: 'Tags', icon: Star },
    { to: '/discuss', label: 'Discuss', icon: MessageSquare },
    { to: '/wishlist', label: 'Wishlist', icon: ListMusic },
    { to: '/discussions', label: 'Archive', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-indigo-600">
            <Disc3 className="h-5 w-5" />
            <span className="hidden sm:inline">Album Club</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  location.pathname === to
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <Link
              to="/about"
              className={`ml-1 flex items-center px-2 py-1 rounded-md transition-colors ${
                location.pathname === '/about'
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Info className="h-4 w-4" />
            </Link>
            <Link
              to="/settings"
              className={`flex items-center px-2 py-1 rounded-md transition-colors ${
                location.pathname === '/settings'
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {membersError && (
        <div className="max-w-3xl mx-auto px-4 pt-4 w-full">
          <ErrorBanner message={`Failed to load members: ${membersError}`} />
        </div>
      )}

      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                currentAlbum={currentAlbum}
                loading={albumLoading}
                albumError={albumError}
                onAlbumPicked={handleAlbumPicked}
              />
            }
          />
          <Route
            path="/album"
            element={<AlbumPage currentAlbum={currentAlbum} />}
          />
          <Route
            path="/discuss"
            element={
              <DiscussionPage
                currentAlbum={currentAlbum}
                members={members}
              />
            }
          />
          <Route
            path="/wishlist"
            element={<WishlistPage onAlbumPicked={handleAlbumPicked} />}
          />
          <Route path="/discussions" element={<DiscussionsListPage />} />
          <Route path="/discussions/new" element={<DiscussionEditPage />} />
          <Route path="/discussions/:albumId" element={<DiscussionViewPage />} />
          <Route path="/discussions/:albumId/edit" element={<DiscussionEditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
