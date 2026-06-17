import { useReaderStore } from '../store/readerStore'
import OpenPdfPanel from './OpenPdfPanel'
import PdfCanvas from './PdfCanvas'
import TextModeOverlay from './TextModeOverlay'
import ScanModeOverlay from './ScanModeOverlay'
import FloatingControls from './FloatingControls'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

export default function ReaderScreen() {
  useKeyboardNavigation()
  const pdfDoc = useReaderStore((s) => s.pdfDoc)
  const readingMode = useReaderStore((s) => s.readingMode)
  const isLoading = useReaderStore((s) => s.isLoading)

  if (!pdfDoc) {
    return <OpenPdfPanel />
  }

  return (
    <div className="relative px-4 py-8 pb-28">
      {isLoading && (
        <p className="mb-3 text-center text-xs text-ink-muted">Loading…</p>
      )}
      <PdfCanvas>{readingMode === 'TEXT' ? <TextModeOverlay /> : <ScanModeOverlay />}</PdfCanvas>
      <FloatingControls />
    </div>
  )
}
