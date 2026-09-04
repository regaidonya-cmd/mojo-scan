'use client'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function StepWrapper({ title, subtitle, children }: Props) {
  return (
    <div style={{ paddingTop: 32, paddingBottom: 16 }}>
      <h1 style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: 'clamp(1.5rem, 4vw, 1.9rem)',
        fontWeight: 800,
        color: 'var(--night)',
        letterSpacing: '-0.04em',
        lineHeight: 1.1,
        margin: 0,
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}
