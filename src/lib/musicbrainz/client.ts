import { MB_RATE_LIMIT_MS } from '../../constants/config'

let lastRequestAt = 0
// Requests are chained so two concurrent callers can't both pass the
// rate-limit check and fire at the same time.
let queue: Promise<unknown> = Promise.resolve()

// No User-Agent header here: it's a forbidden header name in browsers, so
// fetch silently drops it — MusicBrainz identifies us by Origin instead.
export function mbFetch(url: string): Promise<Response> {
  const request = queue.then(async () => {
    const wait = MB_RATE_LIMIT_MS - (Date.now() - lastRequestAt)
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
    lastRequestAt = Date.now()
    return fetch(url, {
      headers: { Accept: 'application/json' },
    })
  })
  queue = request.catch(() => {})
  return request
}
