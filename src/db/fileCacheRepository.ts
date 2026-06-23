// Stores PDF blobs in IndexedDB so recent files can be reopened without a
// file picker, across browser restarts, in any browser.
//
// Storage note: a typical academic PDF is 2–15 MB. We keep the 10 most
// recently accessed files and evict the oldest when the cache grows beyond
// that. IndexedDB quota is generous (usually gigabytes) so this is safe.

import { db } from './db'

const MAX_CACHED = 10

export const FileCacheRepository = {
  async put(pdfId: string, name: string, blob: Blob): Promise<void> {
    const existing = await db.fileCache.where('pdfId').equals(pdfId).first()
    if (existing?.id) {
      await db.fileCache.update(existing.id, { blob, name, cachedAt: Date.now() })
    } else {
      await db.fileCache.add({ pdfId, name, blob, cachedAt: Date.now() })
      // Evict oldest if over limit
      const all = await db.fileCache.orderBy('cachedAt').toArray()
      if (all.length > MAX_CACHED) {
        const toDelete = all.slice(0, all.length - MAX_CACHED)
        await db.fileCache.bulkDelete(toDelete.map((f) => f.id!))
      }
    }
  },

  async get(pdfId: string): Promise<File | null> {
    const record = await db.fileCache.where('pdfId').equals(pdfId).first()
    if (!record) return null
    return new File([record.blob], record.name, { type: 'application/pdf' })
  },

  async getByName(name: string): Promise<File | null> {
    const record = await db.fileCache.where('name').equals(name).first()
    if (!record) return null
    return new File([record.blob], record.name, { type: 'application/pdf' })
  },

  async remove(pdfId: string): Promise<void> {
    await db.fileCache.where('pdfId').equals(pdfId).delete()
  },
}
