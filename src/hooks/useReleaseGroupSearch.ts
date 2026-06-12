import { useCallback } from 'react'
import { searchReleaseGroups } from '../lib/musicbrainz/releaseGroups'
import { useDebouncedSearch } from './useDebouncedSearch'

export function useReleaseGroupSearch(query: string, artistMbid?: string) {
  const search = useCallback((q: string) => searchReleaseGroups(q, artistMbid), [artistMbid])
  return useDebouncedSearch(query, search)
}
