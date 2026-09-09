'use client'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function StepWrapper({ title, subtitle, children }: Props) {
  return (
    <div style={{ paddingTop: 28, paddingBottom: 8 }}>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(1.4rem, 4vw, 1.75rem)',
        fontWeight: 800,
        color: 'var(--night)',
        letterSpacing: '-0.03em',
        lineHeight: 1.15,
        margin: '0 0 8px',
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--muted)',
          lineHeight: 1.6,
          margin: '0 0 4px',
        }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}
