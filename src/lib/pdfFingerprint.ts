// Computes a stable SHA-1 hex fingerprint for a PDF file so annotations are
// keyed to the document content, not just its filename.

export async function computePdfId(file: File): Promise<string> {
  // Hash only the first 64KB + last 64KB to keep it fast on large files.
  const CHUNK = 64 * 1024
  const size = file.size
  let buffer: ArrayBuffer

  if (size <= CHUNK * 2) {
    buffer = await file.arrayBuffer()
  } else {
    const head = await file.slice(0, CHUNK).arrayBuffer()
    const tail = await file.slice(size - CHUNK).arrayBuffer()
    const combined = new Uint8Array(CHUNK * 2)
    combined.set(new Uint8Array(head), 0)
    combined.set(new Uint8Array(tail), CHUNK)
    buffer = combined.buffer
  }

  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
