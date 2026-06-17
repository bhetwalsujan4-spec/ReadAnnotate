import type { Annotation } from '../types'

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19)
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportAnnotationsToCsv(annotations: Annotation[], filename = 'focuspdf-annotations.csv') {
  const header = ['Source Document', 'Page', 'Excerpt', 'Annotation', 'Timestamp']
  const rows = annotations.map((a) => [
    a.pdfName,
    String(a.pageNumber),
    a.excerptText,
    a.noteText,
    formatTimestamp(a.timestamp),
  ])

  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n')

  downloadBlob(csv, filename, 'text/csv;charset=utf-8')
}

export function exportAnnotationsToMarkdown(annotations: Annotation[], filename = 'focuspdf-annotations.md') {
  const header = '| Source Document | Page | Excerpt | Annotation | Timestamp |'
  const divider = '| --- | --- | --- | --- | --- |'
  const escapeCell = (v: string) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ')

  const rows = annotations.map(
    (a) =>
      `| ${escapeCell(a.pdfName)} | ${a.pageNumber} | ${escapeCell(a.excerptText)} | ${escapeCell(a.noteText)} | ${formatTimestamp(a.timestamp)} |`,
  )

  const grouped = annotations.reduce<Record<string, Annotation[]>>((acc, a) => {
    acc[a.pdfName] = acc[a.pdfName] ?? []
    acc[a.pdfName].push(a)
    return acc
  }, {})

  const summaryLines = Object.entries(grouped).map(
    ([doc, items]) => `- **${doc}** — ${items.length} note${items.length === 1 ? '' : 's'}`,
  )

  const markdown = [
    '# FocusPDF Research Notes',
    '',
    `Exported ${formatTimestamp(Date.now())}`,
    '',
    '## Documents',
    ...summaryLines,
    '',
    '## Annotations',
    '',
    header,
    divider,
    ...rows,
    '',
  ].join('\n')

  downloadBlob(markdown, filename, 'text/markdown;charset=utf-8')
}
