import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  SlidersHorizontal,
  ScanLine,
  AlignLeft,
  ListChecks,
} from 'lucide-react'
import { useReaderStore } from '../store/readerStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUiStore } from '../store/uiStore'

function ControlButton({
  onClick,
  label,
  children,
  disabled,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-paper transition-colors hover:bg-ink-3 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

export default function FloatingControls() {
  const readingMode = useReaderStore((s) => s.readingMode)
  const currentPage = useReaderStore((s) => s.currentPage)
  const pageCount = useReaderStore((s) => s.pageCount)
  const nextSentence = useReaderStore((s) => s.nextSentence)
  const prevSentence = useReaderStore((s) => s.prevSentence)
  const nextPage = useReaderStore((s) => s.nextPage)
  const prevPage = useReaderStore((s) => s.prevPage)
  const moveScanWindow = useReaderStore((s) => s.moveScanWindow)
  const toggleReadingMode = useReaderStore((s) => s.toggleReadingMode)
  const stepPct = useSettingsStore((s) => s.scanWindowStepPct)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)
  const setAnnotationEditorOpen = useUiStore((s) => s.setAnnotationEditorOpen)
  const goTo = useUiStore((s) => s.goTo)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-ink-3 bg-ink-2/95 px-2 py-1.5 shadow-xl shadow-black/30 backdrop-blur">
        <ControlButton label="Previous page" onClick={() => void prevPage()} disabled={currentPage <= 1}>
          <ChevronLeft size={18} />
        </ControlButton>

        {readingMode === 'TEXT' ? (
          <>
            <ControlButton label="Previous sentence" onClick={() => void prevSentence()}>
              <ChevronUp size={18} />
            </ControlButton>
            <ControlButton label="Next sentence" onClick={() => void nextSentence()}>
              <ChevronDown size={18} />
            </ControlButton>
          </>
        ) : (
          <>
            <ControlButton label="Move window up" onClick={() => moveScanWindow('up', stepPct)}>
              <ChevronUp size={18} />
            </ControlButton>
            <ControlButton label="Move window down" onClick={() => moveScanWindow('down', stepPct)}>
              <ChevronDown size={18} />
            </ControlButton>
          </>
        )}

        <ControlButton
          label="Next page"
          onClick={() => void nextPage()}
          disabled={currentPage >= pageCount}
        >
          <ChevronRight size={18} />
        </ControlButton>

        <span className="mx-1 h-6 w-px bg-ink-3" />

        <ControlButton label="Add note" onClick={() => setAnnotationEditorOpen(true)}>
          <PencilLine size={18} />
        </ControlButton>
        <ControlButton
          label={readingMode === 'TEXT' ? 'Switch to scan mode' : 'Switch to text mode'}
          onClick={toggleReadingMode}
        >
          {readingMode === 'TEXT' ? <ScanLine size={18} /> : <AlignLeft size={18} />}
        </ControlButton>
        <ControlButton label="My annotations" onClick={() => goTo('annotations')}>
          <ListChecks size={18} />
        </ControlButton>
        <ControlButton label="Settings" onClick={() => setSettingsOpen(true)}>
          <SlidersHorizontal size={18} />
        </ControlButton>

        <span className="ml-2 mr-1 select-none whitespace-nowrap font-mono text-xs text-ink-muted">
          {currentPage} / {pageCount}
        </span>
      </div>
    </div>
  )
}
