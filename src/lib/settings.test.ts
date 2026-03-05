import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadLocalSettings,
  saveLocalSettings,
  isSettingsComplete,
  clearLocalSettings,
} from './settings'

// jsdom provides localStorage via vitest environment: 'jsdom'
beforeEach(() => {
  localStorage.clear()
})

describe('isSettingsComplete', () => {
  it('returns true when all four required fields are present', () => {
    expect(
      isSettingsComplete({
        pat: 'ghp_token',
        myLogin: 'alice',
        repoOwner: 'alice',
        repoName: 'album-club',
      }),
    ).toBe(true)
  })

  it('also accepts optional publishPat', () => {
    expect(
      isSettingsComplete({
        pat: 'ghp_token',
        myLogin: 'alice',
        repoOwner: 'alice',
        repoName: 'album-club',
        publishPat: 'ghp_publish',
      }),
    ).toBe(true)
  })

  it('returns false when pat is missing', () => {
    expect(
      isSettingsComplete({ myLogin: 'alice', repoOwner: 'alice', repoName: 'album-club' }),
    ).toBe(false)
  })

  it('returns false when myLogin is missing', () => {
    expect(
      isSettingsComplete({ pat: 'tok', repoOwner: 'alice', repoName: 'album-club' }),
    ).toBe(false)
  })

  it('returns false when repoOwner is missing', () => {
    expect(
      isSettingsComplete({ pat: 'tok', myLogin: 'alice', repoName: 'album-club' }),
    ).toBe(false)
  })

  it('returns false when repoName is missing', () => {
    expect(
      isSettingsComplete({ pat: 'tok', myLogin: 'alice', repoOwner: 'alice' }),
    ).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isSettingsComplete({})).toBe(false)
  })

  it('returns false when a required field is an empty string', () => {
    expect(
      isSettingsComplete({ pat: '', myLogin: 'alice', repoOwner: 'alice', repoName: 'repo' }),
    ).toBe(false)
  })
})

describe('saveLocalSettings / loadLocalSettings round-trip', () => {
  it('persists and retrieves all required fields', () => {
    const settings = {
      pat: 'ghp_abc',
      myLogin: 'bob',
      repoOwner: 'bob',
      repoName: 'music-club',
    }
    saveLocalSettings(settings)
    expect(loadLocalSettings()).toEqual(settings)
  })

  it('persists and retrieves the optional publishPat field', () => {
    const settings = {
      pat: 'ghp_abc',
      myLogin: 'bob',
      repoOwner: 'bob',
      repoName: 'music-club',
      publishPat: 'ghp_pub',
    }
    saveLocalSettings(settings)
    expect(loadLocalSettings()).toEqual(settings)
  })

  it('partial save only writes provided keys', () => {
    saveLocalSettings({ pat: 'ghp_first' })
    saveLocalSettings({ myLogin: 'carol' })
    const result = loadLocalSettings()
    expect(result.pat).toBe('ghp_first')
    expect(result.myLogin).toBe('carol')
  })

  it('does not return keys that were never saved', () => {
    saveLocalSettings({ pat: 'ghp_only' })
    const result = loadLocalSettings()
    expect(result.myLogin).toBeUndefined()
    expect(result.repoOwner).toBeUndefined()
  })

  it('overwriting a key returns the latest value', () => {
    saveLocalSettings({ pat: 'old' })
    saveLocalSettings({ pat: 'new' })
    expect(loadLocalSettings().pat).toBe('new')
  })
})

describe('clearLocalSettings', () => {
  it('removes all settings keys from localStorage', () => {
    saveLocalSettings({
      pat: 'tok',
      myLogin: 'dave',
      repoOwner: 'dave',
      repoName: 'club',
      publishPat: 'pub',
    })
    clearLocalSettings()
    const result = loadLocalSettings()
    expect(result).toEqual({})
  })

  it('is a no-op when nothing has been saved', () => {
    expect(() => clearLocalSettings()).not.toThrow()
    expect(loadLocalSettings()).toEqual({})
  })
})
