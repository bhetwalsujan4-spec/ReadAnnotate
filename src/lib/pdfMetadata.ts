// Attempts to read Dublin Core / XMP metadata embedded in the PDF
// and map it to a PdfReference object.

import type { PdfDocumentProxy } from './pdfjsSetup'
import type { PdfReference } from '../types'

export async function extractPdfReference(pdf: PdfDocumentProxy, fileName: string): Promise<PdfReference> {
  const ref: PdfReference = {}

  try {
    const meta = await pdf.getMetadata()

    // Standard PDF info dictionary
    const info = meta?.info as Record<string, string> | undefined
    if (info) {
      if (info['Title']) ref.title = info['Title']
      if (info['Author']) ref.author = info['Author']
      if (info['Subject']) ref.journal = info['Subject']
      // CreationDate format: D:YYYYMMDDHHmmSS
      if (info['CreationDate']) {
        const m = info['CreationDate'].match(/D:(\d{4})/)
        if (m) ref.year = m[1]
      }
    }

    // XMP metadata — richer, used by academic publishers
    const xmpData = meta?.metadata as { getAll?: () => Record<string, string> } | undefined
    const xmpStr = xmpData?.getAll?.()
    if (xmpStr) {
      const x = xmpStr as Record<string, string>
      if (!ref.title && x['dc:title']) ref.title = x['dc:title']
      if (!ref.author && x['dc:creator']) ref.author = x['dc:creator']
      if (!ref.year && x['dc:date']) ref.year = x['dc:date'].slice(0, 4)
      if (x['prism:doi'] || x['dc:identifier']) {
        ref.doi = x['prism:doi'] ?? x['dc:identifier']
      }
      if (x['prism:publicationName']) ref.journal = x['prism:publicationName']
      if (x['prism:volume']) ref.volume = x['prism:volume']
      if (x['prism:number']) ref.issue = x['prism:number']
      if (x['prism:startingPage'] && x['prism:endingPage']) {
        ref.pages = `${x['prism:startingPage']}–${x['prism:endingPage']}`
      }
      if (x['prism:url']) ref.url = x['prism:url']
    }
  } catch {
    // Metadata extraction is best-effort; never crash the reader
  }

  // Fall back to filename for title if nothing found
  if (!ref.title) {
    ref.title = fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
  }

  return ref
}
