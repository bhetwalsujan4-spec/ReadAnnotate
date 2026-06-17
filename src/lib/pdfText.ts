import { pdfjsLib, type PdfDocumentProxy, type PdfPageProxy } from './pdfjsSetup'
import { splitSentences } from './sentenceSplitter'
import type { ReadingMode, SentenceBox } from '../types'

interface PositionedItem {
  str: string
  x: number
  y: number
  width: number
  height: number
  hasEOL: boolean
}

function applyMatrix(m: number[], x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

/** Maps each text item's PDF-space transform into canvas pixel space for a given viewport. */
async function getPositionedItems(
  page: PdfPageProxy,
  viewport: pdfjsLib.PageViewport,
): Promise<PositionedItem[]> {
  const textContent = await page.getTextContent()
  const items: PositionedItem[] = []

  for (const raw of textContent.items) {
    // Marked-content items (no str) are skipped.
    if (!('str' in raw)) continue
    const item = raw as { str: string; transform: number[]; width: number; hasEOL?: boolean }
    if (!item.str) continue

    const combined = pdfjsLib.Util.transform(
      viewport.transform as unknown as number[],
      item.transform,
    )
    const fontHeight = Math.hypot(combined[2], combined[3])
    const width = item.width * Math.hypot(combined[0], combined[1])
    const [x, yBaseline] = applyMatrix(combined, 0, 0)
    const y = yBaseline - fontHeight

    items.push({
      str: item.str,
      x,
      y,
      width,
      height: fontHeight,
      hasEOL: item.hasEOL ?? false,
    })
  }

  return items
}

/** Builds the full plain-text string for a page and a parallel offset map back to each item's box. */
function buildTextWithOffsets(items: PositionedItem[]) {
  let text = ''
  const offsets: { start: number; end: number; box: PositionedItem }[] = []

  for (const item of items) {
    const start = text.length
    text += item.str
    const end = text.length
    offsets.push({ start, end, box: item })
    if (item.hasEOL) {
      text += '\n'
    } else if (!item.str.endsWith(' ')) {
      text += ' '
    }
  }

  return { text, offsets }
}

export async function extractPageSentences(page: PdfPageProxy, scale: number): Promise<SentenceBox[]> {
  const viewport = page.getViewport({ scale })
  const items = await getPositionedItems(page, viewport)
  const { text, offsets } = buildTextWithOffsets(items)
  const sentenceSpans = splitSentences(text)

  const boxes: SentenceBox[] = []
  for (const span of sentenceSpans) {
    const overlapping = offsets.filter((o) => o.start < span.end && o.end > span.start)
    if (overlapping.length === 0) continue

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const o of overlapping) {
      minX = Math.min(minX, o.box.x)
      minY = Math.min(minY, o.box.y)
      maxX = Math.max(maxX, o.box.x + o.box.width)
      maxY = Math.max(maxY, o.box.y + o.box.height)
    }

    boxes.push({
      text: span.text,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    })
  }

  return boxes
}

/** Samples a few pages and decides whether the document should open in TEXT or SCAN mode. */
export async function detectReadingMode(pdf: PdfDocumentProxy): Promise<ReadingMode> {
  const pagesToSample = Math.min(3, pdf.numPages)
  let totalChars = 0

  for (let i = 1; i <= pagesToSample; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    for (const raw of content.items) {
      if ('str' in raw) totalChars += (raw as { str: string }).str.length
    }
  }

  const avgCharsPerPage = totalChars / pagesToSample
  return avgCharsPerPage < 40 ? 'SCAN' : 'TEXT'
}
