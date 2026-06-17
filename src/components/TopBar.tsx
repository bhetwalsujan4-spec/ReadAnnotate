import { useRef } from 'react'
import { FolderOpen, Sun, Moon } from 'lucide-react'
import ApertureMark from './ApertureMark'
import { useReaderStore } from '../store/readerStore'
import { useSettingsStore } from '../store/settingsStore'

export default function TopBar() {
  const fileName = useReaderStore((s) => s.fileName)
  const loadDocument = useReaderStore((s) => s.loadDocument)
  const closeDocument = useReaderStore((s) => s.closeDocument)
  const theme = useSettingsStore((s) => s.theme)
  const update = useSettingsStore((s) => s.update)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    update({ theme: next })
    document.documentElement.classList.toggle('light', next === 'light')
  }

  return (
    <header className="flex items-center gap-3 border-b border-ink-3 bg-ink px-4 py-3">
      <button
        className="flex items-center gap-2"
        onClick={closeDocument}
        title="Back to library"
        aria-label="Back to library"
      >
        <ApertureMark size={22} />
        <span className="hidden font-display text-base text-paper sm:inline">FocusPDF</span>
      </button>

      <span className="mx-1 h-5 w-px bg-ink-3" />

      <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
        {fileName ?? 'No document open'}
      </span>

      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-full border border-ink-3 px-3 py-1.5 text-xs text-paper hover:border-lamp"
      >
        <FolderOpen size={14} /> Open
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void loadDocument(file)
          e.target.value = ''
        }}
      />

      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title="Toggle theme"
        className="rounded-full p-2 text-ink-muted hover:bg-ink-3 hover:text-paper"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  )
}
