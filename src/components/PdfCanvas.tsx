import { useEffect, useRef, type ReactNode } from 'react'
import { useReaderStore } from '../store/readerStore'

export default function PdfCanvas({ children }: { children?: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentPageProxy = useReaderStore((s) => s.currentPageProxy)
  const scale = useReaderStore((s) => s.scale)

  // Fit page width to the container, recomputing (debounced) when the window resizes.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const fitScale = async () => {
      const { currentPageProxy: page, scale: currentScale, setScale } = useReaderStore.getState()
      if (!page) return
      const width = container.clientWidth
      if (width === 0) return
      const baseWidth = page.getViewport({ scale: 1 }).width
      const next = width / baseWidth
      if (Math.abs(next - currentScale) > 0.03) {
        await setScale(next)
      }
    }

    void fitScale()

    let timeout: number
    const onResize = () => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(fitScale, 200)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(timeout)
    }
  }, [currentPageProxy])

  // Render the current page to the canvas, at device-pixel resolution for sharpness.
  useEffect(() => {
    let cancelled = false
    const render = async () => {
      const canvas = canvasRef.current
      if (!canvas || !currentPageProxy) return
      const dpr = window.devicePixelRatio || 1
      const viewport = currentPageProxy.getViewport({ scale })
      canvas.width = Math.ceil(viewport.width * dpr)
      canvas.height = Math.ceil(viewport.height * dpr)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      try {
        await currentPageProxy.render({ canvas, canvasContext: ctx, viewport }).promise
      } catch (err) {
        if (!cancelled) console.error('PDF render failed', err)
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [currentPageProxy, scale])

  const viewport = currentPageProxy ? currentPageProxy.getViewport({ scale }) : null

  return (
    <div ref={containerRef} className="w-full">
      {viewport && (
        <div className="relative mx-auto" style={{ width: viewport.width, height: viewport.height }}>
          <canvas ref={canvasRef} className="block select-none rounded-sm shadow-2xl shadow-black/40" />
          {children}
        </div>
      )}
    </div>
  )
}
