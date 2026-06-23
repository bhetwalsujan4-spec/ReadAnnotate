import Dexie, { type EntityTable } from 'dexie'
import type { Annotation, RecentFile } from '../types'

interface CachedFile {
  id?: number
  pdfId: string        // content hash — primary lookup key
  name: string
  blob: Blob
  cachedAt: number
}

class FocusPdfDatabase extends Dexie {
  annotations!: EntityTable<Annotation, 'id'>
  recentFiles!: EntityTable<RecentFile, 'id'>
  fileCache!: EntityTable<CachedFile, 'id'>

  constructor() {
    super('focuspdf-research-reader')
    this.version(1).stores({
      annotations: '++id, pdfName, pageNumber, readingMode, timestamp',
      recentFiles: '++id, &name, updatedAt',
    })
    this.version(2).stores({
      annotations: '++id, pdfName, pdfId, pageNumber, readingMode, timestamp',
      recentFiles: '++id, &name, pdfId, updatedAt',
    })
    this.version(3).stores({
      annotations: '++id, pdfName, pdfId, pageNumber, readingMode, timestamp',
      recentFiles: '++id, &name, pdfId, updatedAt',
      fileCache: '++id, &pdfId, name',
    })
  }
}

export const db = new FocusPdfDatabase()
