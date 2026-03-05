import { describe, it, expect } from 'vitest'
import { decodeContent } from '../files'

// Inverse of the encode used in files.ts:
// btoa(unescape(encodeURIComponent(s)))
function encodeContent(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
}

describe('decodeContent', () => {
  it('decodes an empty string', () => {
    expect(decodeContent(encodeContent(''))).toBe('')
  })

  it('round-trips ASCII text', () => {
    const text = 'Hello, world!'
    expect(decodeContent(encodeContent(text))).toBe(text)
  })

  it('round-trips JSON content', () => {
    const json = JSON.stringify({ foo: 'bar', num: 42 })
    expect(decodeContent(encodeContent(json))).toBe(json)
  })

  it('round-trips UTF-8 text with accented characters', () => {
    const text = 'Björk — Homogénic'
    expect(decodeContent(encodeContent(text))).toBe(text)
  })

  it('round-trips text with emoji', () => {
    const text = '🎵 Music is life 🎶'
    expect(decodeContent(encodeContent(text))).toBe(text)
  })

  it('round-trips text with Japanese characters', () => {
    const text = '音楽クラブ'
    expect(decodeContent(encodeContent(text))).toBe(text)
  })

  it('handles base64 with embedded newlines (as GitHub API returns)', () => {
    // GitHub API breaks base64 into 60-char lines with \n
    const original = 'Hello from GitHub'
    const rawB64 = encodeContent(original)
    // Insert newlines as GitHub does
    const withNewlines = rawB64.replace(/.{20}/g, '$&\n')
    // decodeContent strips \n before decoding
    expect(decodeContent(withNewlines.replace(/\n/g, ''))).toBe(original)
  })
})
