export const GITHUB_API_BASE = 'https://api.github.com'
export const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

export const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2'
export const COVER_ART_BASE = 'https://coverartarchive.org'

export const POLL_INTERVAL_MS = 15_000
export const MB_RATE_LIMIT_MS = 1_100
export const MB_DEBOUNCE_MS = 500

export const MAIN_BRANCH = 'main'
export const MEMBERS_PATH = 'settings/members.json'
export const CURRENT_ALBUM_PATH = 'current-album.json'
export const DISCUSSIONS_DIR = 'discussions'

export const MEMBER_SETTINGS_PATH = 'settings.json'
export const WISHLIST_PATH = 'wishlist.json'
export const REVEAL_PATH = 'reveal.json'

export function tagsPath(albumId: string) {
  return `tags/${albumId}.json`
}

export function notesPath(albumId: string) {
  return `notes/${albumId}.json`
}

export function discussionPath(albumId: string) {
  return `${DISCUSSIONS_DIR}/${albumId}.json`
}
