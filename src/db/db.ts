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
  }
}

export const db = new FocusPdfDatabase()
