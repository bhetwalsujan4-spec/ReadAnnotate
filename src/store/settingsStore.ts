import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '../types'

const DEFAULT_SETTINGS: AppSettings = {
  overlayOpacity: 0.85,
  highlightPadding: 10,
  autoCenterSentence: true,
  scanWindowHeightPct: 0.2,
  scanWindowStepPct: 0.5,
  theme: 'dark',
}

interface SettingsState extends AppSettings {
  update: (patch: Partial<AppSettings>) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'focuspdf-settings' },
  ),
)
