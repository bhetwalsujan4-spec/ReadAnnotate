import { useEffect, useState } from 'react'
import { ArrowLeft, Search, Trash2, Pencil, Check, X, MapPin, Download } from 'lucide-react'
import { AnnotationRepository } from '../db/annotationRepository'
import { useUiStore } from '../store/uiStore'
import { useReaderStore } from '../store/readerStore'
import { exportAnnotationsToCsv, exportAnnotationsToMarkdown } from '../lib/exporters'
import type { Annotation, PdfReference } from '../types'

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Zotero-style reference display card
// ---------------------------------------------------------------------------

function ZoteroCard({ r }: { r: PdfReference }) {
  const type = r.itemType ?? 'journalArticle'
  return (
    <div className="space-y-0.5 text-sm text-paper-dim">
      {r.title && <p className="font-medium text-paper">{r.title}</p>}
      {r.author && <p>{r.author}</p>}
      {type === 'journalArticle' && r.journal && (
        <p className="italic">
          {r.journal}
          {r.volume && `, ${r.volume}`}
          {r.issue && `(${r.issue})`}
          {r.pages && `, pp. ${r.pages}`}
          {r.year && ` (${r.year})`}
        </p>
      )}
      {type !== 'journalArticle' && (r.publisher || r.year) && (
        <p>
          {r.publisher}
          {r.place && `, ${r.place}`}
          {r.year && ` (${r.year})`}
        </p>
      )}
      {r.doi && (
        <p className="font-mono text-xs">
          DOI:{' '}
          <a
            href={`https://doi.org/${r.doi}`}
            target="_blank"
            rel="noreferrer"
            className="text-lamp underline"
          >
            {r.doi}
          </a>
        </p>
      )}
      {r.url && !r.doi && (
        <p className="truncate font-mono text-xs">
          URL:{' '}
          <a href={r.url} target="_blank" rel="noreferrer" className="text-lamp underline">
            {r.url}
          </a>
        </p>
      )}
      {r.extra && <p className="text-xs text-ink-muted">{r.extra}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editable reference form
// ---------------------------------------------------------------------------

const REF_FIELDS: { key: keyof PdfReference; label: string }[] = [
  { key: 'itemType', label: 'Type  (journalArticle · book · report · thesis · webpage)' },
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author(s)' },
  { key: 'year', label: 'Year' },
  { key: 'journal', label: 'Journal / Publication' },
  { key: 'volume', label: 'Volume' },
  { key: 'issue', label: 'Issue' },
  { key: 'pages', label: 'Pages' },
  { key: 'doi', label: 'DOI' },
  { key: 'url', label: 'URL' },
  { key: 'publisher', label: 'Publisher' },
  { key: 'place', label: 'Place' },
  { key: 'extra', label: 'Extra / Notes' },
]

function ReferenceEditor({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: PdfReference
  onChange: (r: PdfReference) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-2">
      {REF_FIELDS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-0.5">
          <label className="font-mono text-xs text-ink-muted">{label}</label>
          <input
            value={(draft[key] as string) ?? ''}
            onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
            className="rounded border border-ink-3 bg-ink px-2 py-1 text-sm text-paper focus:border-lamp focus:outline-none"
          />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="rounded-full px-3 py-1 text-xs text-ink-muted hover:bg-ink-3"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="flex items-center gap-1 rounded-full bg-lamp px-3 py-1 text-xs font-medium text-ink"
        >
          <Check size={13} /> Save
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function AnnotationListScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [jumpMessage, setJumpMessage] = useState<string | null>(null)
  const [editingRef, setEditingRef] = useState(false)
  const [refDraft, setRefDraft] = useState<PdfReference>({})

  const fileName = useReaderStore((s) => s.fileName)
  const reference = useReaderStore((s) => s.reference)
  const setReference = useReaderStore((s) => s.setReference)
  const goToPage = useReaderStore((s) => s.goToPage)
  const setSentenceIndex = useReaderStore((s) => s.setSentenceIndex)
  const setScanWindowTop = useReaderStore((s) => s.setScanWindowTop)
  const sentences = useReaderStore((s) => s.sentences)

  // Always scoped to the currently open file only.
  const refresh = async () => {
    if (!fileName) {
      setAnnotations([])
      return
    }
    const q = query.trim().toLowerCase()
    const all = await AnnotationRepository.byDocument(fileName)
    const filtered = q
      ? all.filter(
          (a) =>
            a.noteText.toLowerCase().includes(q) ||
            a.excerptText.toLowerCase().includes(q),
        )
      : all
    setAnnotations(filtered)
  }

  useEffect(() => {
    void refresh()
  }, [query, fileName]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const refMap = fileName && reference ? { [fileName]: reference } : {}

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => goTo('reader')}
          aria-label="Back to reader"
          className="rounded-full p-2 hover:bg-ink-3"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-paper">Annotations</h1>
          {fileName && (
            <p className="truncate font-mono text-xs text-ink-muted">{fileName}</p>
          )}
        </div>
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
            onClick={() => exportAnnotationsToMarkdown(annotations, undefined, refMap)}
            disabled={annotations.length === 0}
            className="flex items-center gap-1.5 rounded-full border border-ink-3 px-3 py-1.5 text-xs text-paper hover:border-lamp disabled:opacity-30"
          >
            <Download size={14} /> Markdown
          </button>
        </div>
      </div>

      {/* Reference card */}
      {fileName && reference && (
        <div className="mb-5 rounded-xl border border-ink-3 bg-ink-2 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wide text-ink-muted">
              Reference
            </span>
            {!editingRef && (
              <button
                onClick={() => {
                  setRefDraft(reference)
                  setEditingRef(true)
                }}
                title="Edit reference metadata"
                className="rounded-full p-1.5 text-ink-muted hover:bg-ink-3 hover:text-paper"
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
          {editingRef ? (
            <ReferenceEditor
              draft={refDraft}
              onChange={setRefDraft}
              onSave={() => {
                setReference(refDraft)
                setEditingRef(false)
              }}
              onCancel={() => setEditingRef(false)}
            />
          ) : (
            <ZoteroCard r={reference} />
          )}
        </div>
      )}

      {/* No file open warning */}
      {!fileName && (
        <p className="mb-5 rounded-lg border border-ink-3 bg-ink/40 px-3 py-2 text-xs text-ink-muted">
          No PDF is currently open. Annotations are shown per document — open a file first.
        </p>
      )}

      {/* Search */}
      <div className="mb-5">
        <div className="flex items-center gap-2 rounded-full border border-ink-3 bg-ink-2 px-3 py-2">
          <Search size={15} className="text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or excerpts"
            className="w-full bg-transparent text-sm text-paper placeholder:text-ink-muted focus:outline-none"
          />
        </div>
      </div>

      {jumpMessage && (
        <p className="mb-4 rounded-lg border border-ink-3 bg-ink/40 px-3 py-2 text-xs text-ink-muted">
          {jumpMessage}
        </p>
      )}

      {/* Annotation list */}
      {annotations.length === 0 ? (
        <p className="mt-12 text-center text-sm text-ink-muted">
          {fileName
            ? 'No notes for this document yet. Tap "Add note" while reading.'
            : 'Open a PDF to see its annotations.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {annotations.map((a) => (
            <li key={a.id} className="rounded-xl border border-ink-3 bg-ink-2 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-ink-muted">
                  p.{a.pageNumber} · {a.readingMode.toLowerCase()}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-muted">
                  {formatDate(a.timestamp)}
                </span>
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
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-full p-1.5 hover:bg-ink-3"
                    >
                      <X size={15} />
                    </button>
                    <button
                      onClick={() => void saveEdit()}
                      className="rounded-full bg-lamp p-1.5 text-ink"
                    >
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
