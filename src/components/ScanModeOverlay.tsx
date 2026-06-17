import { useReaderStore } from '../store/readerStore'
import { useSettingsStore } from '../store/settingsStore'

export default function ScanModeOverlay() {
  const currentPageProxy = useReaderStore((s) => s.currentPageProxy)
  const scale = useReaderStore((s) => s.scale)
  const scanWindowTop = useReaderStore((s) => s.scanWindowTop)
  const overlayOpacity = useSettingsStore((s) => s.overlayOpacity)
  const windowHeightPct = useSettingsStore((s) => s.scanWindowHeightPct)

  if (!currentPageProxy) return null
  const viewport = currentPageProxy.getViewport({ scale })

  const windowHeight = viewport.height * windowHeightPct
  const windowY = Math.min(scanWindowTop * viewport.height, viewport.height - windowHeight)

  return (
    <svg
      width={viewport.width}
      height={viewport.height}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      className="pointer-events-none absolute inset-0"
    >
      <defs>
        <mask id="scan-cutout-mask">
          <rect x="0" y="0" width={viewport.width} height={viewport.height} fill="white" />
          <rect x="0" y={windowY} width={viewport.width} height={windowHeight} fill="black" />
        </mask>
      </defs>

      <rect
        x="0"
        y="0"
        width={viewport.width}
        height={viewport.height}
        fill="var(--color-ink)"
        opacity={overlayOpacity}
        mask="url(#scan-cutout-mask)"
      />

      <line x1="0" y1={windowY} x2={viewport.width} y2={windowY} stroke="var(--color-lamp)" strokeWidth={2} />
      <line
        x1="0"
        y1={windowY + windowHeight}
        x2={viewport.width}
        y2={windowY + windowHeight}
        stroke="var(--color-lamp)"
        strokeWidth={2}
      />
    </svg>
  )
}
