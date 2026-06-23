import { create } from 'zustand'
import { pdfjsLib, type PdfDocumentProxy, type PdfPageProxy } from '../lib/pdfjsSetup'
import { extractPageSentences, detectReadingMode } from '../lib/pdfText'
import { RecentFileRepository } from '../db/recentFileRepository'
import { FileCacheRepository } from '../db/fileCacheRepository'
import { computePdfId } from '../lib/pdfFingerprint'
import { extractPdfReference } from '../lib/pdfMetadata'
import type { ReadingMode, SentenceBox, PdfReference } from '../types'

interface ReaderState {
  pdfDoc: PdfDocumentProxy | null
  currentPageProxy: PdfPageProxy | null
  fileName: string | null
  pdfId: string | null
  reference: PdfReference | null
  pageCount: number
  currentPage: number
  readingMode: ReadingMode
  sentences: SentenceBox[]
  sentenceIndex: number
  scanWindowTop: number // normalized 0-1, top edge of the reading window within the page
  scale: number
  isLoading: boolean
  error: string | null

  loadDocument: (file: File) => Promise<void>
  setScale: (scale: number) => Promise<void>
  goToPage: (page: number) => Promise<void>
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  nextSentence: () => Promise<void>
  prevSentence: () => Promise<void>
  setSentenceIndex: (index: number) => void
  moveScanWindow: (direction: 'up' | 'down', stepPct: number) => void
  setScanWindowTop: (top: number) => void
  setReference: (ref: PdfReference) => void
  toggleReadingMode: () => void
  closeDocument: () => void
}

async function loadParagraphsForPage(pdfDoc: PdfDocumentProxy, pageNumber: number, scale: number) {
  const page = await pdfDoc.getPage(pageNumber)
  const sentences = await extractPageSentences(page, scale)
  return { page, sentences }
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  pdfDoc: null,
  currentPageProxy: null,
  fileName: null,
  pdfId: null,
  reference: null,
  pageCount: 0,
  currentPage: 1,
  readingMode: 'TEXT',
  sentences: [],
  sentenceIndex: 0,
  scanWindowTop: 0,
  scale: 1.5,
  isLoading: false,
  error: null,

  async loadDocument(file: File) {
    set({ isLoading: true, error: null })
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const mode = await detectReadingMode(pdfDoc)
      const scale = get().scale

      // Compute a stable content-based ID for this PDF so annotations survive renames.
      const pdfId = await computePdfId(file)

      // Cache the file blob so it can be reopened without a picker next time.
      void FileCacheRepository.put(pdfId, file.name, file)

      // Prefer the record keyed by content hash; fall back to name match for old records.
      const existingById = await RecentFileRepository.byPdfId(pdfId)
      const existingByName = await RecentFileRepository.byName(file.name)
      const record = existingById ?? existingByName

      const startPage = record?.lastPage ?? 1

      // Use stored reference if available, otherwise extract from PDF metadata.
      const reference = record?.reference ?? (await extractPdfReference(pdfDoc, file.name))

      let sentences: SentenceBox[] = []
      let page: PdfPageProxy | null = null
      if (mode === 'TEXT') {
        const loaded = await loadParagraphsForPage(pdfDoc, startPage, scale)
        page = loaded.page
        sentences = loaded.sentences
      } else {
        page = await pdfDoc.getPage(startPage)
      }

      set({
        pdfDoc,
        currentPageProxy: page,
        fileName: file.name,
        pdfId,
        reference,
        pageCount: pdfDoc.numPages,
        currentPage: startPage,
        readingMode: mode,
        sentences,
        sentenceIndex: record?.lastSentenceIndex ?? 0,
        scanWindowTop: record?.lastScanTop ?? 0,
        isLoading: false,
      })

      await RecentFileRepository.upsert({
        name: file.name,
        pdfId,
        reference,
        lastPage: startPage,
        lastSentenceIndex: record?.lastSentenceIndex ?? 0,
        lastScanTop: record?.lastScanTop ?? 0,
        detectedMode: mode,
        pageCount: pdfDoc.numPages,
        updatedAt: Date.now(),
      })
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load PDF' })
    }
  },

  async setScale(scale: number) {
    const { pdfDoc, currentPage, readingMode } = get()
    if (!pdfDoc || readingMode !== 'TEXT') {
      set({ scale })
      return
    }
    const { page, sentences } = await loadParagraphsForPage(pdfDoc, currentPage, scale)
    set({ scale, currentPageProxy: page, sentences, sentenceIndex: 0 })
  },

  async goToPage(targetPage: number) {
    const { pdfDoc, pageCount, readingMode, scale, fileName, pdfId, reference, sentenceIndex, scanWindowTop } = get()
    if (!pdfDoc) return
    const page = Math.max(1, Math.min(pageCount, targetPage))

    if (readingMode === 'TEXT') {
      const loaded = await loadParagraphsForPage(pdfDoc, page, scale)
      set({ currentPage: page, currentPageProxy: loaded.page, sentences: loaded.sentences, sentenceIndex: 0 })
    } else {
      const pageProxy = await pdfDoc.getPage(page)
      set({ currentPage: page, currentPageProxy: pageProxy, scanWindowTop: 0 })
    }

    if (fileName && pdfId) {
      await RecentFileRepository.upsert({
        name: fileName,
        pdfId,
        reference: reference ?? undefined,
        lastPage: page,
        lastSentenceIndex: sentenceIndex,
        lastScanTop: scanWindowTop,
        detectedMode: readingMode,
        pageCount,
        updatedAt: Date.now(),
      })
    }
  },

  async nextPage() {
    const { currentPage, pageCount } = get()
    if (currentPage < pageCount) await get().goToPage(currentPage + 1)
  },

  async prevPage() {
    const { currentPage } = get()
    if (currentPage > 1) await get().goToPage(currentPage - 1)
  },

  async nextSentence() {
    const { sentenceIndex, sentences, currentPage, pageCount } = get()
    if (sentenceIndex < sentences.length - 1) {
      get().setSentenceIndex(sentenceIndex + 1)
    } else if (currentPage < pageCount) {
      await get().goToPage(currentPage + 1)
    }
  },

  async prevSentence() {
    const { sentenceIndex, currentPage } = get()
    if (sentenceIndex > 0) {
      get().setSentenceIndex(sentenceIndex - 1)
    } else if (currentPage > 1) {
      const prevPageNum = currentPage - 1
      await get().goToPage(prevPageNum)
      // Land on the last paragraph of the previous page rather than the first
      const { sentences } = get()
      if (sentences.length > 0) get().setSentenceIndex(sentences.length - 1)
    }
  },

  setSentenceIndex(index: number) {
    set({ sentenceIndex: index })
    const { fileName, pdfId, reference, currentPage, pageCount, readingMode, scanWindowTop } = get()
    if (fileName && pdfId) {
      void RecentFileRepository.upsert({
        name: fileName,
        pdfId,
        reference: reference ?? undefined,
        lastPage: currentPage,
        lastSentenceIndex: index,
        lastScanTop: scanWindowTop,
        detectedMode: readingMode,
        pageCount,
        updatedAt: Date.now(),
      })
    }
  },

  moveScanWindow(direction: 'up' | 'down', stepPct: number) {
    const { scanWindowTop } = get()
    const delta = direction === 'down' ? stepPct : -stepPct
    const next = Math.max(0, Math.min(1, scanWindowTop + delta))
    get().setScanWindowTop(next)
  },

  setScanWindowTop(top: number) {
    set({ scanWindowTop: top })
    const { fileName, pdfId, reference, currentPage, pageCount, readingMode, sentenceIndex } = get()
    if (fileName && pdfId) {
      void RecentFileRepository.upsert({
        name: fileName,
        pdfId,
        reference: reference ?? undefined,
        lastPage: currentPage,
        lastSentenceIndex: sentenceIndex,
        lastScanTop: top,
        detectedMode: readingMode,
        pageCount,
        updatedAt: Date.now(),
      })
    }
  },

  setReference(ref: PdfReference) {
    set({ reference: ref })
    const { fileName, pdfId, currentPage, pageCount, readingMode, sentenceIndex, scanWindowTop } = get()
    if (fileName && pdfId) {
      void RecentFileRepository.upsert({
        name: fileName,
        pdfId,
        reference: ref,
        lastPage: currentPage,
        lastSentenceIndex: sentenceIndex,
        lastScanTop: scanWindowTop,
        detectedMode: readingMode,
        pageCount,
        updatedAt: Date.now(),
      })
    }
  },

  toggleReadingMode() {
    set((s) => ({ readingMode: s.readingMode === 'TEXT' ? 'SCAN' : 'TEXT' }))
  },

  closeDocument() {
    set({
      pdfDoc: null,
      currentPageProxy: null,
      fileName: null,
      pdfId: null,
      reference: null,
      pageCount: 0,
      currentPage: 1,
      sentences: [],
      sentenceIndex: 0,
      scanWindowTop: 0,
      error: null,
    })
  },
}))
