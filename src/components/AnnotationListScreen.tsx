import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, Trash2, Pencil, Check, X, MapPin, Download } from 'lucide-react'
import { AnnotationRepository } from '../db/annotationRepository'
import { useUiStore } from '../store/uiStore'
import { useReaderStore } from '../store/readerStore'
import { exportAnnotationsToCsv, exportAnnotationsToMarkdown } from '../lib/exporters'
import type { Annotation } from '../types'

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AnnotationListScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [query, setQuery] = useState('')
  const [docFilter, setDocFilter] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [jumpMessage, setJumpMessage] = useState<string | null>(null)

  const fileName = useReaderStore((s) => s.fileName)
  const goToPage = useReaderStore((s) => s.goToPage)
  const setSentenceIndex = useReaderStore((s) => s.setSentenceIndex)
  const setScanWindowTop = useReaderStore((s) => s.setScanWindowTop)
  const sentences = useReaderStore((s) => s.sentences)

  const refresh = async () => {
    const results = await AnnotationRepository.search(query, docFilter || undefined)
    setAnnotations(results)
  }

  // Re-fetch whenever the search query or document filter changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [query, docFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const documentNames = useMemo(
    () => Array.from(new Set(annotations.map((a) => a.pdfName))),
    [annotations],
  )

  const handleDelete = async (id?: number) => {
    if (id === undefined) return
    await AnnotationRepository.remove(id)
    await refresh()
  }

  const startEdit = (a: Annotation) => {
    setEditingId(a.id ?? null)
    setEditingText(a.noteText)
  }

  const saveEdit = async () => {
    if (editingId === null) return
    await AnnotationRepository.update(editingId, { noteText: editingText })
    setEditingId(null)
    await refresh()
  }

  const jumpTo = async (a: Annotation) => {
    if (a.pdfName !== fileName) {
      setJumpMessage(`Open "${a.pdfName}" from the reader first, then come back to jump to this note.`)
      return
    }
    setJumpMessage(null)
    await goToPage(a.pageNumber)
    if (a.readingMode === 'TEXT') {
      const idx = sentences.findIndex((s) => s.text === a.excerptText)
      setSentenceIndex(idx >= 0 ? idx : 0)
    } else if (a.scanWindowTop !== undefined) {
      setScanWindowTop(a.scanWindowTop)
    }
    goTo('reader')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => goTo('reader')} aria-label="Back to reader" className="rounded-full p-2 hover:bg-ink-3">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-2xl text-paper">Annotations</h1>
        <span className="font-mono text-xs text-ink-muted">{annotations.length}</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportAnnotationsToCsv(annotations)}
            disabled={annotations.length === 0}
            className="flex items-center gap-1.5 rounded-full border border-ink-3 px-3 py-1.5 text-xs text-paper hover:border-lamp disabled:opacity-30"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={() => exportAnnotationsToMarkdown(annotations)}
            disabled={annotations.length === 0}
            className="flex items-center gap-1.5 rounded-full border border-ink-3 px-3 py-1.5 text-xs text-paper hover:border-lamp disabled:opacity-30"
          >
            <Download size={14} /> Markdown
          </button>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-ink-3 bg-ink-2 px-3 py-2">
          <Search size={15} className="text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or excerpts"
            className="w-full bg-transparent text-sm text-paper placeholder:text-ink-muted focus:outline-none"
          />
        </div>
        <select
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value)}
          className="rounded-full border border-ink-3 bg-ink-2 px-3 py-2 text-sm text-paper"
        >
          <option value="">All documents</option>
          {documentNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {jumpMessage && (
        <p className="mb-4 rounded-lg border border-ink-3 bg-ink/40 px-3 py-2 text-xs text-ink-muted">
          {jumpMessage}
        </p>
      )}

      {annotations.length === 0 ? (
        <p className="mt-12 text-center text-sm text-ink-muted">
          No notes yet. Open a PDF and tap "Add note" while reading.
        </p>
      ) : (
        <ul className="space-y-3">
          {annotations.map((a) => (
            <li key={a.id} className="rounded-xl border border-ink-3 bg-ink-2 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-ink-muted">
                  {a.pdfName} · p.{a.pageNumber} · {a.readingMode.toLowerCase()}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-muted">{formatDate(a.timestamp)}</span>
              </div>

              <blockquote className="mb-2 border-l-2 border-sage pl-3 font-display text-sm italic text-paper-dim">
                "{a.excerptText}"
              </blockquote>

              {editingId === a.id ? (
                <div>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-ink-3 bg-ink px-3 py-2 text-sm text-paper focus:border-lamp"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="rounded-full p-1.5 hover:bg-ink-3">
                      <X size={15} />
                    </button>
                    <button onClick={() => void saveEdit()} className="rounded-full bg-lamp p-1.5 text-ink">
                      <Check size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-paper">{a.noteText}</p>
              )}

              <div className="mt-3 flex justify-end gap-1">
                <button
                  onClick={() => void jumpTo(a)}
                  title="Jump to this spot in the reader"
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-ink-muted hover:bg-ink-3 hover:text-paper"
                >
                  <MapPin size={13} /> Jump
                </button>
                <button
                  onClick={() => startEdit(a)}
                  title="Edit note"
                  className="rounded-full p-1.5 text-ink-muted hover:bg-ink-3 hover:text-paper"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => void handleDelete(a.id)}
                  title="Delete note"
                  className="rounded-full p-1.5 text-ink-muted hover:bg-ink-3 hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
