import { useState, useCallback } from 'react'
import {
  loadLocalSettings,
  saveLocalSettings,
  isSettingsComplete,
  type LocalSettings,
} from '../lib/settings'

export function useSettings() {
  const [settings, setSettings] = useState<Partial<LocalSettings>>(loadLocalSettings)

  const update = useCallback((partial: Partial<LocalSettings>) => {
    const next = { ...settings, ...partial }
    saveLocalSettings(next)
    setSettings(next)
  }, [settings])

  return {
    settings,
    update,
    isComplete: isSettingsComplete(settings),
  }
}
