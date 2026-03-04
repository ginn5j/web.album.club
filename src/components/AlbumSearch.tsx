import { useState, type FormEvent } from 'react'
import { Search, Music } from 'lucide-react'
import { useMusicBrainz } from '../hooks/useMusicBrainz'
import { lookupRelease } from '../lib/musicbrainz/lookup'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Spinner } from './ui/Spinner'
import type { AlbumInfo, Song } from '../types/album'

interface AlbumSearchProps {
  onSelect: (album: AlbumInfo, songs: Song[], source: 'musicbrainz' | 'manual') => void
}

export function AlbumSearch({ onSelect }: AlbumSearchProps) {
  const [query, setQuery] = useState('')
  const [selectedMbid, setSelectedMbid] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [showManual, setShowManual] = useState(false)

  // Manual entry form state
  const [manualTitle, setManualTitle] = useState('')
  const [manualArtist, setManualArtist] = useState('')
  const [manualYear, setManualYear] = useState('')
  const [manualGenre, setManualGenre] = useState('')
  const [manualTracks, setManualTracks] = useState('')

  const { results, loading } = useMusicBrainz(showManual ? '' : query)

  async function handleSelect(mbid: string) {
    setSelectedMbid(mbid)
    setLookingUp(true)
    try {
      const { album, songs } = await lookupRelease(mbid)
      onSelect(album, songs, 'musicbrainz')
      setQuery('')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load album details')
    } finally {
      setLookingUp(false)
      setSelectedMbid(null)
    }
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault()
    const titles = manualTracks.split('\n').filter((t) => t.trim())
    const songs: Song[] = titles.map((title, i) => ({
      position: i + 1,
      title: title.trim(),
    }))
    const album: AlbumInfo = {
      title: manualTitle.trim(),
      artist: manualArtist.trim(),
      releaseYear: manualYear ? parseInt(manualYear, 10) : undefined,
      genre: manualGenre.trim() || undefined,
    }
    onSelect(album, songs, 'manual')
    setShowManual(false)
    setManualTitle('')
    setManualArtist('')
    setManualYear('')
    setManualGenre('')
    setManualTracks('')
  }

  if (showManual) {
    return (
      <form onSubmit={handleManualSubmit} className="space-y-4">
        <h3 className="font-semibold text-gray-900">Enter Album Manually</h3>
        <Input label="Album Title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} required />
        <Input label="Artist" value={manualArtist} onChange={(e) => setManualArtist(e.target.value)} required />
        <Input label="Release Year" type="number" value={manualYear} onChange={(e) => setManualYear(e.target.value)} />
        <Input label="Genre" value={manualGenre} onChange={(e) => setManualGenre(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Track List (one per line)</label>
          <textarea
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            rows={8}
            value={manualTracks}
            onChange={(e) => setManualTracks(e.target.value)}
            placeholder="So What&#10;Freddie Freeloader&#10;Blue in Green..."
            required
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Use This Album</Button>
          <Button variant="secondary" type="button" onClick={() => setShowManual(false)}>
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          className="block w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Search MusicBrainz… (e.g. artist:Kraftwerk date:2009)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <Spinner size="sm" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white shadow-sm">
          {results.map((r) => (
            <li key={r.mbid}>
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50"
                disabled={lookingUp}
                onClick={() => handleSelect(r.mbid)}
              >
                {lookingUp && selectedMbid === r.mbid ? (
                  <Spinner size="sm" />
                ) : (
                  <Music className="h-4 w-4 shrink-0 text-gray-400" />
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900">{r.title}</div>
                  <div className="text-xs text-gray-500">
                    {r.artist}
                    {r.releaseYear ? ` · ${r.releaseYear}` : ''}
                    {r.country ? ` · ${r.country}` : ''}
                    {r.disambiguation ? ` · ${r.disambiguation}` : ''}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        className="text-sm text-indigo-600 hover:underline"
        onClick={() => setShowManual(true)}
      >
        Enter album manually instead
      </button>
    </div>
  )
}
