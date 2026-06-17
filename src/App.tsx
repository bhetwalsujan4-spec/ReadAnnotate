import { useEffect } from 'react'
import TopBar from './components/TopBar'
import ReaderScreen from './components/ReaderScreen'
import AnnotationListScreen from './components/AnnotationListScreen'
import AnnotationEditorSheet from './components/AnnotationEditorSheet'
import SettingsPanel from './components/SettingsPanel'
import { useUiStore } from './store/uiStore'
import { useSettingsStore } from './store/settingsStore'

export default function App() {
  const screen = useUiStore((s) => s.screen)
  const theme = useSettingsStore((s) => s.theme)

  // Apply the persisted theme on first load (settings are restored from localStorage before this runs)
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  return (
    <div className="min-h-screen bg-ink">
      <TopBar />
      {screen === 'reader' ? <ReaderScreen /> : <AnnotationListScreen />}
      <AnnotationEditorSheet />
      <SettingsPanel />
    </div>
  )
}
