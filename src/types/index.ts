// Core domain types for FocusPDF Research Reader

export type ReadingMode = 'TEXT' | 'SCAN'

export interface PdfReference {
  title?: string
  author?: string
  year?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  doi?: string
  url?: string
  publisher?: string
  place?: string
  itemType?: string  // e.g. "journalArticle", "book", "report"
  extra?: string
}

export interface Annotation {
  id?: number
  pdfName: string
  pdfId: string
  pageNumber: number
  excerptText: string
  noteText: string
  readingMode: ReadingMode
  /** Normalized 0-1 position within the page, used to re-open SCAN mode at the right spot */
  scanWindowTop?: number
  timestamp: number
}

export interface RecentFile {
  id?: number
  name: string
  pdfId: string
  reference?: PdfReference
  lastPage: number
  lastSentenceIndex: number
  lastScanTop: number
  detectedMode: ReadingMode
  pageCount: number
  /** File System Access API handle, stored only in browsers that support it (Chromium-based) */
  handle?: FileSystemFileHandle
  updatedAt: number
}

export interface AppSettings {
  overlayOpacity: number // 0-1
  highlightPadding: number // px
  autoCenterSentence: boolean
  scanWindowHeightPct: number // 0-1, relative to viewport height
  scanWindowStepPct: number // 0-1, relative to window height
  theme: 'dark' | 'light'
  highlightBrightness: number  // 0–1, default 1
}

export interface SentenceBox {
  text: string
  // Bounding box in canvas pixel space (top-left origin)
  x: number
  y: number
  width: number
  height: number
}

export interface PageTextData {
  pageNumber: number
  sentences: SentenceBox[]
}
