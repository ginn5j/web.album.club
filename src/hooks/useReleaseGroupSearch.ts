import { useCallback } from 'react'
import { searchReleaseGroups } from '../lib/musicbrainz/releaseGroups'
import { useDebouncedSearch } from './useDebouncedSearch'

export function useReleaseGroupSearch(query: string, artistMbid?: string, artistName?: string) {
  const search = useCallback(
    (q: string) => searchReleaseGroups(q, artistMbid, artistName),
    [artistMbid, artistName],
  )
  return useDebouncedSearch(query, search)
}
