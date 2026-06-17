import { useEffect } from 'react'
import { useReaderStore } from '../store/readerStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUiStore } from '../store/uiStore'

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

export function useKeyboardNavigation() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInField(e.target)) return
      const { isAnnotationEditorOpen, isSettingsOpen, screen } = useUiStore.getState()
      if (isAnnotationEditorOpen || isSettingsOpen || screen !== 'reader') return

      const { readingMode, nextSentence, prevSentence, nextPage, prevPage, moveScanWindow } =
        useReaderStore.getState()
      const { scanWindowStepPct } = useSettingsStore.getState()

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (readingMode === 'TEXT') void nextSentence()
          else moveScanWindow('down', scanWindowStepPct)
          break
        case 'ArrowUp':
          e.preventDefault()
          if (readingMode === 'TEXT') void prevSentence()
          else moveScanWindow('up', scanWindowStepPct)
          break
        case 'ArrowRight':
          e.preventDefault()
          void nextPage()
          break
        case 'ArrowLeft':
          e.preventDefault()
          void prevPage()
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
