import { db } from './db'
import type { Annotation } from '../types'

export const AnnotationRepository = {
  async add(annotation: Annotation): Promise<number> {
    return db.annotations.add(annotation) as unknown as Promise<number>
  },

  async update(id: number, changes: Partial<Annotation>): Promise<void> {
    await db.annotations.update(id, changes)
  },

  async remove(id: number): Promise<void> {
    await db.annotations.delete(id)
  },

  async all(): Promise<Annotation[]> {
    return db.annotations.orderBy('timestamp').reverse().toArray()
  },

  async byDocument(pdfName: string): Promise<Annotation[]> {
    return db.annotations.where('pdfName').equals(pdfName).toArray()
  },

  async search(query: string, pdfNameFilter?: string): Promise<Annotation[]> {
    const all = await this.all()
    const q = query.trim().toLowerCase()
    return all.filter((a) => {
      const matchesDoc = !pdfNameFilter || a.pdfName === pdfNameFilter
      if (!matchesDoc) return false
      if (!q) return true
      return (
        a.noteText.toLowerCase().includes(q) ||
        a.excerptText.toLowerCase().includes(q) ||
        a.pdfName.toLowerCase().includes(q)
      )
    })
  },

  async distinctDocumentNames(): Promise<string[]> {
    const all = await this.all()
    return Array.from(new Set(all.map((a) => a.pdfName)))
  },
}
