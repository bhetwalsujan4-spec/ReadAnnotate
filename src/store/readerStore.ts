import { create } from 'zustand'
import { pdfjsLib, type PdfDocumentProxy, type PdfPageProxy } from '../lib/pdfjsSetup'
import { extractPageSentences, detectReadingMode } from '../lib/pdfText'
import { RecentFileRepository } from '../db/recentFileRepository'
import type { ReadingMode, SentenceBox } from '../types'

interface ReaderState {
  pdfDoc: PdfDocumentProxy | null
  currentPageProxy: PdfPageProxy | null
  fileName: string | null
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
  toggleReadingMode: () => void
  closeDocument: () => void
}

async function loadSentencesForPage(pdfDoc: PdfDocumentProxy, pageNumber: number, scale: number) {
  const page = await pdfDoc.getPage(pageNumber)
  const sentences = await extractPageSentences(page, scale)
  return { page, sentences }
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  pdfDoc: null,
  currentPageProxy: null,
  fileName: null,
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
      const existing = await RecentFileRepository.byName(file.name)
      const startPage = existing?.lastPage ?? 1
      const scale = get().scale

      let sentences: SentenceBox[] = []
      let page: PdfPageProxy | null = null
      if (mode === 'TEXT') {
        const loaded = await loadSentencesForPage(pdfDoc, startPage, scale)
        page = loaded.page
        sentences = loaded.sentences
      } else {
        page = await pdfDoc.getPage(startPage)
      }

      set({
        pdfDoc,
        currentPageProxy: page,
        fileName: file.name,
        pageCount: pdfDoc.numPages,
        currentPage: startPage,
        readingMode: mode,
        sentences,
        sentenceIndex: existing?.lastSentenceIndex ?? 0,
        scanWindowTop: existing?.lastScanTop ?? 0,
        isLoading: false,
      })

      await RecentFileRepository.upsert({
        name: file.name,
        lastPage: startPage,
        lastSentenceIndex: existing?.lastSentenceIndex ?? 0,
        lastScanTop: existing?.lastScanTop ?? 0,
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
    const { page, sentences } = await loadSentencesForPage(pdfDoc, currentPage, scale)
    set({ scale, currentPageProxy: page, sentences, sentenceIndex: 0 })
  },

  async goToPage(targetPage: number) {
    const { pdfDoc, pageCount, readingMode, scale, fileName } = get()
    if (!pdfDoc) return
    const page = Math.max(1, Math.min(pageCount, targetPage))

    if (readingMode === 'TEXT') {
      const loaded = await loadSentencesForPage(pdfDoc, page, scale)
      set({ currentPage: page, currentPageProxy: loaded.page, sentences: loaded.sentences, sentenceIndex: 0 })
    } else {
      const pageProxy = await pdfDoc.getPage(page)
      set({ currentPage: page, currentPageProxy: pageProxy, scanWindowTop: 0 })
    }

    if (fileName) {
      const state = get()
      await RecentFileRepository.upsert({
        name: fileName,
        lastPage: page,
        lastSentenceIndex: state.sentenceIndex,
        lastScanTop: state.scanWindowTop,
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
      // Land on the last sentence of the previous page rather than the first
      const { sentences } = get()
      if (sentences.length > 0) get().setSentenceIndex(sentences.length - 1)
    }
  },

  setSentenceIndex(index: number) {
    set({ sentenceIndex: index })
    const { fileName, currentPage, pageCount, readingMode, scanWindowTop } = get()
    if (fileName) {
      void RecentFileRepository.upsert({
        name: fileName,
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
    const { fileName, currentPage, pageCount, readingMode, sentenceIndex } = get()
    if (fileName) {
      void RecentFileRepository.upsert({
        name: fileName,
        lastPage: currentPage,
        lastSentenceIndex: sentenceIndex,
        lastScanTop: top,
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
      pageCount: 0,
      currentPage: 1,
      sentences: [],
      sentenceIndex: 0,
      scanWindowTop: 0,
      error: null,
    })
  },
}))
