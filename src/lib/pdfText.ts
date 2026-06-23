import { pdfjsLib, type PdfDocumentProxy, type PdfPageProxy } from './pdfjsSetup'
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

async function getPositionedItems(
  page: PdfPageProxy,
  viewport: pdfjsLib.PageViewport,
): Promise<PositionedItem[]> {
  const textContent = await page.getTextContent()
  const items: PositionedItem[] = []

  for (const raw of textContent.items) {
    if (!('str' in raw)) continue
    const item = raw as { str: string; transform: number[]; width: number; hasEOL?: boolean }
    if (!item.str.trim()) continue

    const combined = pdfjsLib.Util.transform(
      viewport.transform as unknown as number[],
      item.transform,
    )
    const fontHeight = Math.hypot(combined[2], combined[3])
    const width = item.width * Math.hypot(combined[0], combined[1])
    const [x, yBaseline] = applyMatrix(combined, 0, 0)
    const y = yBaseline - fontHeight

    items.push({ str: item.str, x, y, width, height: fontHeight, hasEOL: item.hasEOL ?? false })
  }

  return items
}

/**
 * Groups PDF text items into paragraph bounding boxes.
 *
 * The key insight: pdfjs emits text items in the order the PDF stores them,
 * which is usually reading order within a text block. The `hasEOL` flag is
 * true on the last item of each line within a block, and pdfjs also emits
 * a MarkedContent separator between separate text blocks.
 *
 * Strategy:
 * 1. Sort items top→bottom, left→right.
 * 2. Cluster into visual lines by Y proximity (within 60% of line height).
 * 3. Within each line, sort items left→right.
 * 4. Detect paragraph breaks between consecutive lines using TWO signals:
 *    a. The gap between line bottom and next line top exceeds 1.2× line height
 *       (blank line / section break).
 *    b. The indent of the next line's first word is significantly larger than
 *       the left margin of the current paragraph (indented new paragraph).
 *    c. The previous line's last item had hasEOL=true AND the gap is > 0.3×
 *       line height (explicit block end marker from pdfjs).
 * 5. Build tight bounding boxes per paragraph, clamped to viewport.
 */
export async function extractPageSentences(
  page: PdfPageProxy,
  scale: number,
): Promise<SentenceBox[]> {
  const viewport = page.getViewport({ scale })
  const items = await getPositionedItems(page, viewport)
  if (items.length === 0) return []

  // --- Step 1: sort top-to-bottom, left-to-right ---
  items.sort((a, b) => a.y - b.y || a.x - b.x)

  // --- Step 2: cluster into visual lines ---
  const lines: PositionedItem[][] = []
  let currentLine: PositionedItem[] = [items[0]]

  for (let i = 1; i < items.length; i++) {
    const prev = currentLine[0] // use first item of line as y-reference
    const curr = items[i]
    const refHeight = (prev.height + curr.height) / 2
    if (Math.abs(curr.y - prev.y) <= refHeight * 0.6) {
      currentLine.push(curr)
    } else {
      lines.push(currentLine)
      currentLine = [curr]
    }
  }
  lines.push(currentLine)

  // Sort items within each line left-to-right
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x)
  }

  // --- Step 3: compute median line height for thresholds ---
  const lineHeights = lines.map((l) => Math.max(...l.map((i) => i.height)))
  const sorted = [...lineHeights].sort((a, b) => a - b)
  const medianH = sorted[Math.floor(sorted.length / 2)] || 12

  // --- Step 4: cluster lines into paragraphs ---
  const paragraphs: PositionedItem[][] = []
  let currentPara: PositionedItem[] = [...lines[0]]

  // Track the left margin of the current paragraph (x of first item in first line)
  let paraLeftX = lines[0][0].x

  for (let li = 1; li < lines.length; li++) {
    const prevLine = lines[li - 1]
    const currLine = lines[li]

    const prevBottom = Math.max(...prevLine.map((i) => i.y + i.height))
    const currTop = Math.min(...currLine.map((i) => i.y))
    const gap = currTop - prevBottom

    const prevLastItem = prevLine[prevLine.length - 1]
    const currFirstX = currLine[0].x

    // Signal a: large vertical gap (blank line or section spacing)
    const bigGap = gap > medianH * 1.2

    // Signal b: explicit EOL from pdfjs AND any non-trivial gap
    const eolBreak = prevLastItem.hasEOL && gap > medianH * 0.3

    // Signal c: next line is indented relative to paragraph left margin
    // (common in books/theses where paragraphs start with an indent)
    const indentBreak = currFirstX > paraLeftX + medianH * 1.5 && gap > 0

    // Signal d: next line starts to the LEFT of current paragraph margin by
    // a large amount — new column or section heading flush-left reset
    const columnBreak = currFirstX < paraLeftX - medianH * 2

    const isNewPara = bigGap || eolBreak || indentBreak || columnBreak

    if (isNewPara) {
      paragraphs.push(currentPara)
      currentPara = [...currLine]
      paraLeftX = currFirstX
    } else {
      currentPara.push(...currLine)
    }
  }
  paragraphs.push(currentPara)

  // --- Step 5: build bounding boxes ---
  const boxes: SentenceBox[] = []
  for (const group of paragraphs) {
    const text = group.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()
    if (text.length < 3) continue // skip noise (single chars, stray punctuation)

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const item of group) {
      minX = Math.min(minX, item.x)
      minY = Math.min(minY, item.y)
      maxX = Math.max(maxX, item.x + item.width)
      maxY = Math.max(maxY, item.y + item.height)
    }

    // Clamp to viewport
    minX = Math.max(0, minX)
    minY = Math.max(0, minY)
    maxX = Math.min(viewport.width, maxX)
    maxY = Math.min(viewport.height, maxY)

    if (maxX > minX && maxY > minY) {
      boxes.push({ text, x: minX, y: minY, width: maxX - minX, height: maxY - minY })
    }
  }

  return boxes
}

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
