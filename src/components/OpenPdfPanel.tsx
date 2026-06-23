import { useEffect, useRef, useState } from 'react'
import { FileUp, RotateCcw } from 'lucide-react'
import { useReaderStore } from '../store/readerStore'
import { RecentFileRepository } from '../db/recentFileRepository'
import type { RecentFile } from '../types'
import ApertureMark from './ApertureMark'

const supportsFileSystemAccess =
  typeof window !== 'undefined' && 'showOpenFilePicker' in window

async function pickWithFSA(): Promise<{ file: File; handle: FileSystemFileHandle } | null> {
  try {
    const [handle] = await (
      window as Window & {
        showOpenFilePicker: (o: object) => Promise<FileSystemFileHandle[]>
      }
    ).showOpenFilePicker({
      types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
      multiple: false,
    })
    const file = await handle.getFile()
    return { file, handle }
  } catch {
    return null // user cancelled
  }
}

export default function OpenPdfPanel() {
  const loadDocument = useReaderStore((s) => s.loadDocument)
  const error = useReaderStore((s) => s.error)
  const isLoading = useReaderStore((s) => s.isLoading)
  const inputRef = useRef<HTMLInputElement>(null)
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [reopenStatus, setReopenStatus] = useState<string | null>(null)

  useEffect(() => {
    RecentFileRepository.all().then(setRecentFiles)
  }, [])

  const handleFile = (file: File, handle?: FileSystemFileHandle) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return
    setReopenStatus(null)
    // Store handle after load so the record already exists in the DB
    if (handle) {
      // slight delay to let loadDocument create/update the record first
      setTimeout(() => {
        RecentFileRepository.byName(file.name).then((existing) => {
          if (existing) {
            void RecentFileRepository.upsert({ ...existing, handle, updatedAt: Date.now() })
          }
        })
      }, 1500)
    }
    void loadDocument(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so the same file can be selected again
    e.target.value = ''
  }

  const handleDropZoneClick = () => {
    if (supportsFileSystemAccess) {
      pickWithFSA().then((result) => {
        if (result) handleFile(result.file, result.handle)
      })
    } else {
      inputRef.current?.click()
    }
  }

  const handleReopenClick = async (rf: RecentFile) => {
    setReopenStatus(null)

    // Try the stored FSA handle first
    if (rf.handle) {
      try {
        const perm = await rf.handle.requestPermission({ mode: 'read' })
        if (perm === 'granted') {
          const file = await rf.handle.getFile()
          handleFile(file, rf.handle)
          return
        }
      } catch {
        // handle is stale — fall through
      }
    }

    // No handle or permission denied — ask user to pick again
    setReopenStatus(
      `Select "${rf.name}" from the file picker — your position will be restored automatically.`,
    )
    if (supportsFileSystemAccess) {
      const result = await pickWithFSA()
      if (result) handleFile(result.file, result.handle)
    } else {
      inputRef.current?.click()
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <ApertureMark size={40} className="mb-5 opacity-90" />
      <h1 className="font-display text-3xl text-paper">Open a PDF to begin</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        FocusPDF reveals one paragraph at a time so the page can't pull your eye ahead.
      </p>

      {/* Drop zone — plain div, not a label, to avoid click-relay conflicts */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleDropZoneClick()}
        onClick={handleDropZoneClick}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        className={`mt-7 flex w-full max-w-sm cursor-pointer select-none flex-col items-center gap-2 rounded-xl border-2 border-dashed px-8 py-10 transition-colors ${
          isDragOver ? 'border-lamp bg-lamp/5' : 'border-ink-3 hover:border-ink-border'
        }`}
      >
        <FileUp size={26} className="text-lamp" />
        <span className="font-medium text-paper">
          {isLoading ? 'Opening…' : 'Choose a PDF, or drop it here'}
        </span>
        <span className="text-xs text-ink-muted">
          Text PDFs open in paragraph mode · scans open in scan mode
        </span>
      </div>

      {/* Hidden file input — used as fallback when FSA is unavailable */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleInputChange}
      />

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {reopenStatus && (
        <p className="mt-4 max-w-sm text-sm text-amber-400">{reopenStatus}</p>
      )}

      {recentFiles.length > 0 && (
        <div className="mt-10 w-full max-w-sm text-left">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Recent
          </h2>
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
                  onClick={() => void handleReopenClick(rf)}
                  className="ml-3 flex shrink-0 items-center gap-1 rounded-md border border-ink-3 px-2.5 py-1 text-xs text-paper hover:border-lamp hover:text-lamp"
                >
                  <RotateCcw size={11} /> Reopen
                </button>
              </li>
            ))}
          </ul>
          {!supportsFileSystemAccess && (
            <p className="mt-2 text-xs text-ink-muted">
              Your browser requires re-selecting files — position is restored automatically.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
