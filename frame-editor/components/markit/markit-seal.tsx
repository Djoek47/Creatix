type MarkitSealProps = {
  size?: number
  className?: string
}

export function MarkitSeal({ size = 40, className }: MarkitSealProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '999px',
        background:
          'radial-gradient(circle at 35% 30%, oklch(0.95 0.02 85), oklch(0.84 0.06 85) 45%, oklch(0.7 0.1 85) 80%)',
        border: '1px solid var(--border)',
        boxShadow: '0 0 24px color-mix(in oklch, var(--primary) 24%, transparent)',
        display: 'grid',
        placeItems: 'center',
      }}
      aria-label="Circe et Venus seal"
    >
      <span
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: Math.max(12, Math.floor(size * 0.34)),
          color: 'oklch(0.12 0 0)',
          letterSpacing: '0.04em',
          fontStyle: 'italic',
          fontWeight: 600,
        }}
      >
        C∴V
      </span>
    </div>
  )
}

