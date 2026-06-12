import { searchArtists } from '../lib/musicbrainz/artists'
import { useDebouncedSearch } from './useDebouncedSearch'

export function useArtistSearch(query: string) {
  return useDebouncedSearch(query, searchArtists)
}
