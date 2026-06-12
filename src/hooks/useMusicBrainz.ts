import { searchReleases } from '../lib/musicbrainz/search'
import { useDebouncedSearch } from './useDebouncedSearch'

export function useMusicBrainz(query: string) {
  return useDebouncedSearch(query, searchReleases)
}
