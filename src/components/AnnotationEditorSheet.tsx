import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { useReaderStore } from '../store/readerStore'
import { useUiStore } from '../store/uiStore'
import { AnnotationRepository } from '../db/annotationRepository'

export default function AnnotationEditorSheet() {
  const isOpen = useUiStore((s) => s.isAnnotationEditorOpen)
  const setOpen = useUiStore((s) => s.setAnnotationEditorOpen)
  const fileName = useReaderStore((s) => s.fileName)
  const currentPage = useReaderStore((s) => s.currentPage)
  const readingMode = useReaderStore((s) => s.readingMode)
  const sentences = useReaderStore((s) => s.sentences)
  const sentenceIndex = useReaderStore((s) => s.sentenceIndex)
  const scanWindowTop = useReaderStore((s) => s.scanWindowTop)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen || !fileName) return null

  const excerpt =
    readingMode === 'TEXT'
      ? sentences[sentenceIndex]?.text ?? '(no sentence detected on this page)'
      : `Scan region near ${Math.round(scanWindowTop * 100)}% down the page`

  const close = () => {
    setNote('')
    setOpen(false)
  }

  const save = async () => {
    if (!note.trim()) return
    setSaving(true)
    await AnnotationRepository.add({
      pdfName: fileName,
      pageNumber: currentPage,
      excerptText: excerpt,
      noteText: note.trim(),
      readingMode,
      scanWindowTop: readingMode === 'SCAN' ? scanWindowTop : undefined,
      timestamp: Date.now(),
    })
    setSaving(false)
    close()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-4 pb-28 sm:items-center sm:pb-4">
      <div className="w-full max-w-md rounded-2xl border border-ink-3 bg-ink-2 p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-paper">Add note</h2>
            <p className="font-mono text-xs text-ink-muted">
              {fileName} · page {currentPage}
            </p>
          </div>
          <button onClick={close} aria-label="Cancel" className="rounded-full p-1.5 hover:bg-ink-3">
            <X size={18} />
          </button>
        </div>

        <blockquote className="mb-3 rounded-lg border-l-2 border-lamp bg-ink/40 px-3 py-2 font-display text-sm italic text-paper-dim">
          "{excerpt}"
        </blockquote>

        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's worth remembering here?"
          rows={4}
          className="w-full resize-none rounded-lg border border-ink-3 bg-ink px-3 py-2 text-sm text-paper placeholder:text-ink-muted focus:border-lamp"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={close} className="rounded-full px-4 py-2 text-sm text-ink-muted hover:bg-ink-3">
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={!note.trim() || saving}
            className="flex items-center gap-1.5 rounded-full bg-lamp px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
          >
            <Check size={16} />
            Save note
          </button>
        </div>
      </div>
    </div>
  )
}
