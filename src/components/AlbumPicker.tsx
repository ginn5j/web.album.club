import { useState } from 'react'
import { AlbumSearch } from './AlbumSearch'
import { AlbumSearchV2 } from './AlbumSearchV2'
import type { AlbumInfo, Song } from '../types/album'

interface AlbumPickerProps {
  onSelect: (album: AlbumInfo, songs: Song[], source: 'musicbrainz' | 'manual') => void
}

export function AlbumPicker({ onSelect }: AlbumPickerProps) {
  const [useV2, setUseV2] = useState(true)

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setUseV2(true)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            useV2
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          Artist / Release
        </button>
        <button
          type="button"
          onClick={() => setUseV2(false)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            !useV2
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          Query Search
        </button>
      </div>
      {useV2 ? (
        <AlbumSearchV2 onSelect={onSelect} />
      ) : (
        <AlbumSearch onSelect={onSelect} />
      )}
    </div>
  )
}
