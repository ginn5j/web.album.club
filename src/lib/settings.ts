export interface LocalSettings {
  pat: string
  myLogin: string
  repoOwner: string
  repoName: string
  publishPat?: string
}

const KEYS: (keyof LocalSettings)[] = ['pat', 'myLogin', 'repoOwner', 'repoName', 'publishPat']

export function loadLocalSettings(): Partial<LocalSettings> {
  const settings: Partial<LocalSettings> = {}
  for (const key of KEYS) {
    const value = localStorage.getItem(key)
    if (value) settings[key] = value
  }
  return settings
}

export function saveLocalSettings(settings: Partial<LocalSettings>): void {
  for (const key of KEYS) {
    const value = settings[key]
    if (value !== undefined) {
      localStorage.setItem(key, value)
    }
  }
}

export function isSettingsComplete(s: Partial<LocalSettings>): s is LocalSettings {
  return !!(s.pat && s.myLogin && s.repoOwner && s.repoName)
}

export function clearLocalSettings(): void {
  for (const key of KEYS) {
    localStorage.removeItem(key)
  }
}

export type SearchStyle = 'artist-release' | 'query'

const SEARCH_STYLE_KEY = 'searchStyle'

export function loadSearchStyle(): SearchStyle {
  return localStorage.getItem(SEARCH_STYLE_KEY) === 'query' ? 'query' : 'artist-release'
}

export function saveSearchStyle(style: SearchStyle): void {
  localStorage.setItem(SEARCH_STYLE_KEY, style)
}
