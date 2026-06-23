import { useEffect, useRef } from 'react'
import { useReaderStore } from '../store/readerStore'
import { useSettingsStore } from '../store/settingsStore'

export default function TextModeOverlay() {
  const currentPageProxy = useReaderStore((s) => s.currentPageProxy)
  const scale = useReaderStore((s) => s.scale)
  const sentences = useReaderStore((s) => s.sentences)
  const sentenceIndex = useReaderStore((s) => s.sentenceIndex)
  const overlayOpacity = useSettingsStore((s) => s.overlayOpacity)
  const padding = useSettingsStore((s) => s.highlightPadding)
  const autoCenter = useSettingsStore((s) => s.autoCenterSentence)
  const brightness = useSettingsStore((s) => s.highlightBrightness)
  const cutoutRef = useRef<SVGRectElement>(null)
  const box = sentences[sentenceIndex]

  useEffect(() => {
    if (autoCenter && cutoutRef.current) {
      cutoutRef.current.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
  }, [sentenceIndex, autoCenter])

  if (!currentPageProxy) return null
  const viewport = currentPageProxy.getViewport({ scale })

  if (sentences.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-ink/70 text-center text-sm text-ink-muted">
        No extractable paragraphs found on this page.
        <br />
        Try Scan Mode from the controls below.
      </div>
    )
  }

  const cutoutX = Math.max(0, (box?.x ?? 0) - padding)
  const cutoutY = Math.max(0, (box?.y ?? 0) - padding)
  const cutoutW = (box?.width ?? 0) + padding * 2
  const cutoutH = (box?.height ?? 0) + padding * 2

  // brightness=1 → fully visible, brightness=0 → black overlay on the cutout
  const dimOpacity = 1 - brightness

  return (
    <svg
      width={viewport.width}
      height={viewport.height}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      className="pointer-events-none absolute inset-0"
    >
      <defs>
        <mask id="text-cutout-mask">
          <rect x="0" y="0" width={viewport.width} height={viewport.height} fill="white" />
          <rect x={cutoutX} y={cutoutY} width={cutoutW} height={cutoutH} rx={6} fill="black" />
        </mask>
        <filter id="lamp-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Dark overlay on everything outside the highlight */}
      <rect
        x="0"
        y="0"
        width={viewport.width}
        height={viewport.height}
        fill="var(--color-ink)"
        opacity={overlayOpacity}
        mask="url(#text-cutout-mask)"
      />

      {/* Brightness dimmer over the highlighted cutout */}
      {dimOpacity > 0 && (
        <rect
          x={cutoutX}
          y={cutoutY}
          width={cutoutW}
          height={cutoutH}
          rx={6}
          fill="black"
          opacity={dimOpacity}
        />
      )}

      {/* Glow ring */}
      <rect
        ref={cutoutRef}
        x={cutoutX}
        y={cutoutY}
        width={cutoutW}
        height={cutoutH}
        rx={6}
        fill="none"
        stroke="var(--color-lamp)"
        strokeOpacity={0.55}
        strokeWidth={2}
        filter="url(#lamp-glow)"
      />
      <rect
        x={cutoutX}
        y={cutoutY}
        width={cutoutW}
        height={cutoutH}
        rx={6}
        fill="none"
        stroke="var(--color-lamp)"
        strokeOpacity={0.9}
        strokeWidth={1.5}
      />
    </svg>
  )
}
