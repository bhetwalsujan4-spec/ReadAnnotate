import Dexie, { type EntityTable } from 'dexie'
import type { Annotation, RecentFile } from '../types'

class FocusPdfDatabase extends Dexie {
  annotations!: EntityTable<Annotation, 'id'>
  recentFiles!: EntityTable<RecentFile, 'id'>

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
  }
}

export const db = new FocusPdfDatabase()
