import { useEffect, useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { useReaderStore } from '../store/readerStore'
import { RecentFileRepository } from '../db/recentFileRepository'
import type { RecentFile } from '../types'
import ApertureMark from './ApertureMark'

export default function OpenPdfPanel() {
  const loadDocument = useReaderStore((s) => s.loadDocument)
  const error = useReaderStore((s) => s.error)
  const isLoading = useReaderStore((s) => s.isLoading)
  const inputRef = useRef<HTMLInputElement>(null)
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    RecentFileRepository.all().then(setRecentFiles)
  }, [])

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return
    void loadDocument(file)
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <ApertureMark size={40} className="mb-5 opacity-90" />
      <h1 className="font-display text-3xl text-paper">Open a PDF to begin</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        FocusPDF reveals one sentence — or one scanned strip — at a time, so the page can't pull your eye
        ahead of your reading.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          handleFile(e.dataTransfer.files[0])
        }}
        className={`mt-7 flex w-full max-w-sm cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-8 py-10 transition-colors ${
          isDragOver ? 'border-lamp bg-lamp/5' : 'border-ink-3 hover:border-ink-border'
        }`}
      >
        <FileUp size={26} className="text-lamp" />
        <span className="font-medium text-paper">{isLoading ? 'Opening…' : 'Choose a PDF, or drop it here'}</span>
        <span className="text-xs text-ink-muted">Text PDFs open in sentence mode · scans open in scan mode</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {recentFiles.length > 0 && (
        <div className="mt-10 w-full max-w-sm text-left">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Recent</h2>
          <ul className="divide-y divide-ink-3 rounded-lg border border-ink-3">
            {recentFiles.map((rf) => (
              <li key={rf.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-paper">{rf.name}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    page {rf.lastPage} of {rf.pageCount} · {rf.detectedMode.toLowerCase()} mode
                  </p>
                </div>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="ml-3 shrink-0 rounded-md border border-ink-3 px-2.5 py-1 text-xs text-paper hover:border-lamp hover:text-lamp"
                  title="Browsers require re-selecting the file for security; pick it again to resume here."
                >
                  Reopen
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">
            Browsers don't allow re-opening a file automatically — pick it again and your page and position
            will be restored.
          </p>
        </div>
      )}
    </div>
  )
}
