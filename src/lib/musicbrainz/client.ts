import { MB_RATE_LIMIT_MS } from '../../constants/config'

const USER_AGENT = 'web.album.club/0.1.0 (https://github.com/album-club/web.album.club)'

let lastRequestAt = 0

export async function mbFetch(url: string): Promise<Response> {
  const now = Date.now()
  const wait = MB_RATE_LIMIT_MS - (now - lastRequestAt)
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
  lastRequestAt = Date.now()

  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  })
}
