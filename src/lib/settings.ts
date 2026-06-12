export type SearchStyle = 'artist-release' | 'query'

const SEARCH_STYLE_KEY = 'searchStyle'

export function loadSearchStyle(): SearchStyle {
  return localStorage.getItem(SEARCH_STYLE_KEY) === 'query' ? 'query' : 'artist-release'
}

export function saveSearchStyle(style: SearchStyle): void {
  localStorage.setItem(SEARCH_STYLE_KEY, style)
}
