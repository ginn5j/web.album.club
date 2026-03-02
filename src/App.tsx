import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { Disc3, Star, MessageSquare, ListMusic, BookOpen, Settings, Home } from 'lucide-react'
import { ToastContainer, type ToastMessage } from './components/ui/Toast'
import { ErrorBanner } from './components/ui/ErrorBanner'
import { SettingsPage } from './pages/SettingsPage'
import { HomePage } from './pages/HomePage'
import { AlbumPage } from './pages/AlbumPage'
import { WishlistPage } from './pages/WishlistPage'
import { DiscussionPage } from './pages/DiscussionPage'
import { DiscussionsListPage } from './pages/DiscussionsListPage'
import { DiscussionEditPage } from './pages/DiscussionEditPage'
import { DiscussionViewPage } from './pages/DiscussionViewPage'
import { loadLocalSettings, isSettingsComplete, type LocalSettings } from './lib/settings'
import { useActiveAlbum } from './hooks/useActiveAlbum'
import { readMembers } from './lib/storage/album'
import type { CurrentAlbum } from './types/album'
import type { Member, MembersConfig } from './types/member'

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

  const [settings, setSettings] = useState<LocalSettings | null>(() => {
    const raw = loadLocalSettings()
    return isSettingsComplete(raw) ? raw : null
  })

  const refreshSettings = useCallback(() => {
    const raw = loadLocalSettings()
    setSettings(isSettingsComplete(raw) ? raw : null)
  }, [])

  const [members, setMembers] = useState<Member[]>([])
  const [membersError, setMembersError] = useState<string | null>(null)

  // Redirect to settings if not configured
  useEffect(() => {
    if (!settings && location.pathname !== '/settings') {
      navigate('/settings')
    }
  }, [settings, location.pathname, navigate])

  // Load members list on startup
  useEffect(() => {
    if (!settings) return
    readMembers(settings.pat, settings.repoOwner, settings.repoName)
      .then((data: MembersConfig | null) => {
        if (data?.members) setMembers(data.members)
      })
      .catch((e: unknown) => setMembersError(e instanceof Error ? e.message : 'Failed to load members'))
  }, [settings?.pat, settings?.repoOwner, settings?.repoName])

  const handleAlbumChanged = useCallback(
    (album: CurrentAlbum) => {
      addToast(
        `New album picked: ${album.album.title} by ${album.album.artist}`,
        'info',
      )
    },
    [addToast],
  )

  const { currentAlbum, loading: albumLoading, error: albumError, refresh } = useActiveAlbum(
    settings,
    handleAlbumChanged,
  )

  const handleAlbumPicked = useCallback(() => {
    refresh()
    navigate('/')
  }, [refresh, navigate])

  if (!settings) {
    return <SettingsPage onSave={refreshSettings} />
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
              to="/settings"
              className="ml-1 flex items-center px-2 py-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Errors */}
      {membersError && (
        <div className="max-w-3xl mx-auto px-4 pt-4 w-full">
          <ErrorBanner message={`Failed to load members: ${membersError}`} />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                currentAlbum={currentAlbum}
                loading={albumLoading}
                albumError={albumError}
                settings={settings}
                onAlbumPicked={handleAlbumPicked}
              />
            }
          />
          <Route
            path="/album"
            element={<AlbumPage currentAlbum={currentAlbum} settings={settings} members={members} />}
          />
          <Route
            path="/discuss"
            element={
              <DiscussionPage
                currentAlbum={currentAlbum}
                members={members}
                settings={settings}
              />
            }
          />
          <Route
            path="/wishlist"
            element={<WishlistPage settings={settings} onAlbumPicked={handleAlbumPicked} />}
          />
          <Route
            path="/discussions"
            element={<DiscussionsListPage settings={settings} />}
          />
          <Route
            path="/discussions/new"
            element={<DiscussionEditPage settings={settings} members={members} />}
          />
          <Route
            path="/discussions/:albumId"
            element={<DiscussionViewPage settings={settings} />}
          />
          <Route
            path="/discussions/:albumId/edit"
            element={<DiscussionEditPage settings={settings} members={members} />}
          />
          <Route path="/settings" element={<SettingsPage onSave={refreshSettings} />} />
        </Routes>
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
