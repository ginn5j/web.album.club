import { describe, it, expect } from 'vitest'
import { tagsPath, notesPath, discussionPath, MB_RATE_LIMIT_MS, MB_DEBOUNCE_MS } from '../config'

describe('tagsPath', () => {
  it('returns the correct path for a simple id', () => {
    expect(tagsPath('abc-123')).toBe('tags/abc-123.json')
  })

  it('interpolates the album id verbatim', () => {
    expect(tagsPath('radiohead-ok-computer-2024')).toBe(
      'tags/radiohead-ok-computer-2024.json',
    )
  })
})

describe('notesPath', () => {
  it('returns the correct path for a simple id', () => {
    expect(notesPath('abc-123')).toBe('notes/abc-123.json')
  })

  it('interpolates the album id verbatim', () => {
    expect(notesPath('pink-floyd-dsotm-1973')).toBe(
      'notes/pink-floyd-dsotm-1973.json',
    )
  })
})

describe('discussionPath', () => {
  it('returns the correct path for a simple id', () => {
    expect(discussionPath('abc-123')).toBe('discussions/abc-123.json')
  })

  it('uses the DISCUSSIONS_DIR constant as prefix', () => {
    expect(discussionPath('x')).toMatch(/^discussions\//)
  })

  it('interpolates the album id verbatim', () => {
    expect(discussionPath('my-album-2024')).toBe('discussions/my-album-2024.json')
  })
})

describe('MusicBrainz timing constants', () => {
  it('MB_RATE_LIMIT_MS is 1100', () => {
    expect(MB_RATE_LIMIT_MS).toBe(1100)
  })
  it('MB_DEBOUNCE_MS is 500', () => {
    expect(MB_DEBOUNCE_MS).toBe(500)
  })
})
