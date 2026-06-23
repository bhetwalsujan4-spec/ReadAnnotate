import type { Annotation, PdfReference } from '../types'

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

export function exportAnnotationsToMarkdown(
  annotations: Annotation[],
  filename = 'focuspdf-annotations.md',
  references: Record<string, PdfReference> = {},
) {
  const grouped = annotations.reduce<Record<string, Annotation[]>>((acc, a) => {
    acc[a.pdfName] = acc[a.pdfName] ?? []
    acc[a.pdfName].push(a)
    return acc
  }, {})

  const sections: string[] = [
    '# FocusPDF Research Notes',
    '',
    `Exported ${formatTimestamp(Date.now())}`,
    '',
  ]

  for (const [doc, items] of Object.entries(grouped)) {
    const ref = references[doc]
    sections.push(`## ${doc}`, '')

    if (ref) {
      sections.push('**Reference**', '')
      if (ref.itemType) sections.push(`- Item Type: ${ref.itemType}`)
      if (ref.title)    sections.push(`- Title: ${ref.title}`)
      if (ref.author)   sections.push(`- Author: ${ref.author}`)
      if (ref.year)     sections.push(`- Year: ${ref.year}`)
      if (ref.journal)  sections.push(`- Journal: ${ref.journal}`)
      if (ref.volume)   sections.push(`- Volume: ${ref.volume}`)
      if (ref.issue)    sections.push(`- Issue: ${ref.issue}`)
      if (ref.pages)    sections.push(`- Pages: ${ref.pages}`)
      if (ref.doi)      sections.push(`- DOI: https://doi.org/${ref.doi}`)
      if (ref.url && !ref.doi) sections.push(`- URL: ${ref.url}`)
      if (ref.publisher) sections.push(`- Publisher: ${ref.publisher}`)
      if (ref.place)    sections.push(`- Place: ${ref.place}`)
      if (ref.extra)    sections.push(`- Extra: ${ref.extra}`)
      sections.push('')
    }

    sections.push('**Annotations**', '')
    for (const a of items) {
      sections.push(
        `### p.${a.pageNumber} — ${formatTimestamp(a.timestamp)}`,
        '',
        `> ${a.excerptText.replace(/\n/g, ' ')}`,
        '',
        a.noteText,
        '',
      )
    }
  }

  downloadBlob(sections.join('\n'), filename, 'text/markdown;charset=utf-8')
}
