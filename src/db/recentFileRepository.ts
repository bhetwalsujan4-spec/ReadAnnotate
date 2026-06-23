import { db } from './db'
import type { RecentFile } from '../types'

export const RecentFileRepository = {
  async upsert(entry: RecentFile): Promise<void> {
    const existing = await db.recentFiles.where('name').equals(entry.name).first()
    if (existing?.id) {
      await db.recentFiles.update(existing.id, { ...entry, id: existing.id })
    } else {
      await db.recentFiles.add(entry)
    }
  },

  async all(limit = 10): Promise<RecentFile[]> {
    return db.recentFiles.orderBy('updatedAt').reverse().limit(limit).toArray()
  },

  async byName(name: string): Promise<RecentFile | undefined> {
    return db.recentFiles.where('name').equals(name).first()
  },

  async byPdfId(pdfId: string): Promise<RecentFile | undefined> {
    return db.recentFiles.where('pdfId').equals(pdfId).first()
  },

  async remove(id: number): Promise<void> {
    await db.recentFiles.delete(id)
  },
}
