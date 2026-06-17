// A lightweight sentence boundary splitter tuned for academic/research text.
// Pure regex sentence splitting breaks badly on "Fig. 3", "e.g.", "Dr. Smith",
// "et al.", single initials ("J. Smith"), and decimal numbers ("p < .05").
// This guards against the common cases without pulling in a full NLP library.

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st',
  'fig', 'figs', 'eq', 'eqn', 'eqs', 'vol', 'vols', 'no', 'nos',
  'pp', 'p', 'ed', 'eds', 'al', 'etc', 'vs', 'cf', 'ca', 'approx',
  'ie', 'eg', 'cit', 'ibid', 'op', 'art', 'sec', 'secs', 'ch', 'chs',
])

export interface SentenceSpan {
  text: string
  start: number
  end: number
}

export function splitSentences(pageText: string): SentenceSpan[] {
  const spans: SentenceSpan[] = []
  let sentenceStart = 0
  // A boundary candidate is one or more . ! ? followed by whitespace or end-of-text.
  const boundaryRegex = /[.!?]+(?=\s|$)/g
  let match: RegExpExecArray | null

  while ((match = boundaryRegex.exec(pageText)) !== null) {
    const punctEnd = match.index + match[0].length
    const beforeText = pageText.slice(sentenceStart, match.index)

    // Decimal number guard: "p < .05" or "3.14" -> digit immediately before the dot
    const precedingChar = pageText[match.index - 1] ?? ''
    const isDecimal = /\d/.test(precedingChar) && match[0].startsWith('.')

    const wordMatch = beforeText.match(/([A-Za-z]+)\s*$/)
    const rawWord = wordMatch?.[1] ?? ''
    const lastWord = rawWord.toLowerCase()
    const isSingleInitial = rawWord.length === 1 && rawWord === rawWord.toUpperCase()
    // Catches "e.g." / "i.e." where the internal period breaks contiguous-letter matching
    const isInternalDotAbbrev = /\b[a-zA-Z]\.[a-zA-Z]$/.test(beforeText)
    const isAbbrev = ABBREVIATIONS.has(lastWord) || isSingleInitial || isInternalDotAbbrev

    if (isAbbrev || isDecimal) {
      continue
    }

    const raw = pageText.slice(sentenceStart, punctEnd).trim()
    if (raw.length > 0) {
      spans.push({ text: raw, start: sentenceStart, end: punctEnd })
    }
    sentenceStart = punctEnd
  }

  const tail = pageText.slice(sentenceStart).trim()
  if (tail.length > 0) {
    spans.push({ text: tail, start: sentenceStart, end: pageText.length })
  }

  return spans
}
