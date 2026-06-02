import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, X } from 'lucide-react'
import { useArtistSearch } from '../hooks/useArtistSearch'
import { useReleaseGroupSearch } from '../hooks/useReleaseGroupSearch'
import { getReleasesByGroup } from '../lib/musicbrainz/releaseGroups'
import { Spinner } from './ui/Spinner'
import type { ArtistResult } from '../lib/musicbrainz/artists'
import type { ReleaseGroupResult, ReleaseInGroup } from '../lib/musicbrainz/releaseGroups'

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function AlbumSearchV2() {
  const [artistQuery, setArtistQuery] = useState('')
  const [selectedArtist, setSelectedArtist] = useState<ArtistResult | null>(null)
  const [showArtistDropdown, setShowArtistDropdown] = useState(false)

  const [rgQuery, setRgQuery] = useState('')
  const [selectedRg, setSelectedRg] = useState<ReleaseGroupResult | null>(null)
  const [showRgDropdown, setShowRgDropdown] = useState(false)

  const [releases, setReleases] = useState<ReleaseInGroup[]>([])
  const [loadingReleases, setLoadingReleases] = useState(false)
  const [releasesError, setReleasesError] = useState<string | null>(null)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { results: artistResults, loading: artistLoading } = useArtistSearch(
    selectedArtist ? '' : artistQuery,
  )
  const { results: rgResults, loading: rgLoading } = useReleaseGroupSearch(
    selectedRg ? '' : rgQuery,
    selectedArtist?.mbid,
  )

  useEffect(() => {
    if (!selectedRg) {
      setReleases([])
      setReleasesError(null)
      return
    }
    let cancelled = false
    setLoadingReleases(true)
    setReleasesError(null)
    getReleasesByGroup(selectedRg.mbid)
      .then((r) => {
        if (!cancelled) setReleases(r)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setReleasesError(e instanceof Error ? e.message : 'Failed to load releases')
      })
      .finally(() => {
        if (!cancelled) setLoadingReleases(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedRg])

  function handleArtistInput(value: string) {
    setArtistQuery(value)
    if (selectedArtist) {
      setSelectedArtist(null)
      clearRg()
    }
    setShowArtistDropdown(true)
  }

  function handleArtistSelect(artist: ArtistResult) {
    setSelectedArtist(artist)
    setArtistQuery(artist.name)
    setShowArtistDropdown(false)
    clearRg()
  }

  function clearArtist() {
    setSelectedArtist(null)
    setArtistQuery('')
    setShowArtistDropdown(false)
    clearRg()
  }

  function handleRgInput(value: string) {
    setRgQuery(value)
    if (selectedRg) {
      setSelectedRg(null)
      setReleases([])
      setReleasesError(null)
      setExpandedIds(new Set())
    }
    setShowRgDropdown(true)
  }

  function handleRgSelect(rg: ReleaseGroupResult) {
    setSelectedRg(rg)
    setRgQuery(rg.title)
    setShowRgDropdown(false)
    setExpandedIds(new Set())
  }

  function clearRg() {
    setSelectedRg(null)
    setRgQuery('')
    setShowRgDropdown(false)
    setReleases([])
    setReleasesError(null)
    setExpandedIds(new Set())
  }

  function toggleRelease(mbid: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(mbid)) next.delete(mbid)
      else next.add(mbid)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Artist field */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Artist</label>
        <div className="relative">
          <input
            className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-8 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Search for an artist…"
            value={artistQuery}
            onChange={(e) => handleArtistInput(e.target.value)}
            onFocus={() => {
              if (!selectedArtist && artistQuery.trim()) setShowArtistDropdown(true)
            }}
            onBlur={() => setTimeout(() => setShowArtistDropdown(false), 150)}
          />
          {artistLoading && (
            <div className="absolute right-3 top-2.5">
              <Spinner size="sm" />
            </div>
          )}
          {selectedArtist && !artistLoading && (
            <button
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              onClick={clearArtist}
              type="button"
              aria-label="Clear artist"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {selectedArtist && (
          <p className="mt-1 text-xs text-indigo-600">
            Filtering by: {selectedArtist.name}
            {selectedArtist.disambiguation ? ` (${selectedArtist.disambiguation})` : ''}
          </p>
        )}
        {showArtistDropdown && artistResults.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
            {artistResults.map((a) => (
              <li key={a.mbid}>
                <button
                  className="flex w-full flex-col px-4 py-2 text-left hover:bg-gray-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleArtistSelect(a)}
                  type="button"
                >
                  <span className="text-sm font-medium text-gray-900">{a.name}</span>
                  {a.disambiguation && (
                    <span className="text-xs text-gray-500">{a.disambiguation}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Release Group field */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Release Group</label>
        <div className="relative">
          <input
            className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-8 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Search for a release group…"
            value={rgQuery}
            onChange={(e) => handleRgInput(e.target.value)}
            onFocus={() => {
              if (!selectedRg && rgQuery.trim()) setShowRgDropdown(true)
            }}
            onBlur={() => setTimeout(() => setShowRgDropdown(false), 150)}
          />
          {rgLoading && (
            <div className="absolute right-3 top-2.5">
              <Spinner size="sm" />
            </div>
          )}
          {selectedRg && !rgLoading && (
            <button
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              onClick={clearRg}
              type="button"
              aria-label="Clear release group"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {showRgDropdown && rgResults.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
            {rgResults.map((rg) => (
              <li key={rg.mbid}>
                <button
                  className="flex w-full flex-col px-4 py-2 text-left hover:bg-gray-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleRgSelect(rg)}
                  type="button"
                >
                  <span className="text-sm font-medium text-gray-900">{rg.title}</span>
                  <span className="text-xs text-gray-500">
                    {rg.artistCredit}
                    {rg.firstReleaseYear ? ` · ${rg.firstReleaseYear}` : ''}
                    {rg.primaryType ? ` · ${rg.primaryType}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Releases list */}
      {loadingReleases && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}
      {releasesError && <p className="text-sm text-red-600">{releasesError}</p>}
      {!loadingReleases && releases.length > 0 && (
        <div className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white shadow-sm">
          {releases.map((release) => {
            const expanded = expandedIds.has(release.mbid)
            return (
              <div key={release.mbid}>
                <div className="flex items-center gap-2 px-3 py-3">
                  <button
                    className="shrink-0 text-gray-400 hover:text-gray-600"
                    onClick={() => toggleRelease(release.mbid)}
                    type="button"
                    aria-label={expanded ? 'Collapse tracks' : 'Expand tracks'}
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {release.title}
                    </span>
                    {release.date && (
                      <span className="text-xs text-gray-400">{release.date}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs text-gray-500">
                    {release.format && <span>{release.format}</span>}
                    <span>{release.trackCount} tracks</span>
                    {release.country && <span>{release.country}</span>}
                  </div>
                </div>
                {expanded && (
                  <div className="divide-y divide-gray-100 border-t border-gray-100 bg-gray-50">
                    {release.tracks.length === 0 ? (
                      <p className="px-8 py-2 text-xs text-gray-400">Track details unavailable</p>
                    ) : (
                      release.tracks.map((track, i) => (
                        <div key={i} className="flex items-center gap-3 px-8 py-1.5">
                          <span className="w-8 shrink-0 text-right text-xs text-gray-400">
                            {track.number}
                          </span>
                          <span className="flex-1 truncate text-sm text-gray-800">
                            {track.title}
                          </span>
                          {track.durationMs != null && (
                            <span className="shrink-0 text-xs text-gray-400">
                              {formatDuration(track.durationMs)}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
