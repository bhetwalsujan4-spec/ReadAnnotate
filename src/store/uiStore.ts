import { create } from 'zustand'

export type Screen = 'reader' | 'annotations'

interface UiState {
  screen: Screen
  isSettingsOpen: boolean
  isAnnotationEditorOpen: boolean
  goTo: (screen: Screen) => void
  setSettingsOpen: (open: boolean) => void
  setAnnotationEditorOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  screen: 'reader',
  isSettingsOpen: false,
  isAnnotationEditorOpen: false,
  goTo: (screen) => set({ screen }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setAnnotationEditorOpen: (open) => set({ isAnnotationEditorOpen: open }),
}))
