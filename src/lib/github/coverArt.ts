// Downloads an album's cover so it can be committed with its post instead of
// being hot-linked. Cover Art Archive and the archive.org hosts it redirects to
// send Access-Control-Allow-Origin: *, so the browser can read the bytes.

const FETCH_TIMEOUT_MS = 20_000

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

export interface CoverArt {
  bytes: Uint8Array
  extension: string
}

// Albums store the 500px thumbnail (lookup.ts); the 1200px one is sharper as a
// post's hero image, so try it first and fall back to the stored URL.
function candidateUrls(url: string): string[] {
  const large = url.replace(/\/front-500$/, '/front-1200')
  return large === url ? [url] : [large, url]
}

async function fetchImage(url: string): Promise<CoverArt | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    const extension = EXTENSIONS[type]
    if (!extension) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    return bytes.length > 0 ? { bytes, extension } : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Resolves to null when the cover can't be downloaded (no cover uploaded,
// network error, not an image); callers then keep the remote URL.
export async function fetchCoverArt(url: string): Promise<CoverArt | null> {
  for (const candidate of candidateUrls(url)) {
    const cover = await fetchImage(candidate)
    if (cover) return cover
  }
  return null
}
