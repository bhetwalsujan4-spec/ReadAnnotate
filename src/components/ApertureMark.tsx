interface Props {
  size?: number
  className?: string
}

/** Six overlapping aperture blades around a clear center — the page's one recurring motif. */
export default function ApertureMark({ size = 22, className }: Props) {
  const blades = Array.from({ length: 6 })
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--color-ink-3)" strokeWidth="1" />
      {blades.map((_, i) => {
        const angle = (i * 60 * Math.PI) / 180
        const x1 = 12 + 9 * Math.cos(angle)
        const y1 = 12 + 9 * Math.sin(angle)
        const x2 = 12 + 3.2 * Math.cos(angle + 0.9)
        const y2 = 12 + 3.2 * Math.sin(angle + 0.9)
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A 9 9 0 0 1 ${12 + 9 * Math.cos(angle + 1.05)} ${12 + 9 * Math.sin(angle + 1.05)} L ${x2} ${y2} Z`}
            fill="var(--color-lamp)"
            opacity={0.85}
          />
        )
      })}
      <circle cx="12" cy="12" r="3" fill="var(--color-ink)" />
    </svg>
  )
}
