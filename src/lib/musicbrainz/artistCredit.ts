export interface MBArtistCredit {
  name?: string
  artist?: { name: string }
  joinphrase?: string
}

// Joins every credited name with its join phrase, e.g.
// "Johnny Blue Skies" + " & " + "the Dark Clouds". The credited name wins over
// the artist's canonical name (a performance name can be credited to another
// artist entity, such as Johnny Blue Skies to Sturgill Simpson).
export function formatArtistCredit(credits: MBArtistCredit[] | undefined): string {
  return (
    (credits ?? []).map((c) => (c.name ?? c.artist?.name ?? '') + (c.joinphrase ?? '')).join('') ||
    'Unknown Artist'
  )
}
