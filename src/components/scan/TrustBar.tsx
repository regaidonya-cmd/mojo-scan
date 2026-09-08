'use client'

const VIOLET = '#6B35B8'
const MUTED  = '#6B6680'

const items = [
  { icon: '🏆', text: 'Certifié Qualiopi' },
  { icon: '⏱', text: '~8 minutes' },
  { icon: '🎁', text: 'Gratuit' },
  { icon: '🔒', text: 'Sans engagement' },
  { icon: '🛡', text: 'Données protégées' },
]

export function TrustBar() {
  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap' as const,
      justifyContent: 'center', padding: '10px 0 2px',
    }}>
      {items.map((item, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 600, color: MUTED,
          padding: '3px 10px', borderRadius: 999,
          background: '#fff', border: '1px solid #EDEAF5',
        }}>
          <span style={{ fontSize: 12 }}>{item.icon}</span>
          {item.text}
        </span>
      ))}
    </div>
  )
}

// Bloc réassurance compact pour StepCompany
export function TrustCompact() {
  return (
    <div style={{
      background: '#F7F6FC', borderRadius: 12,
      padding: '14px 16px', marginTop: 20,
      border: '1px solid #EDEAF5',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>👩‍💼</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1A186E', margin: 0 }}>Donya Regai</p>
          <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Fondatrice — MOJO ACADÉMIE</p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' as const }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px',
            borderRadius: 999, background: '#EDE9FB', color: VIOLET,
            display: 'block', marginBottom: 3,
          }}>Qualiopi ✓</span>
          <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {'★★★★★'.split('').map((s, i) => (
              <span key={i} style={{ fontSize: 12, color: '#F59E0B' }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
        "Ce diagnostic est 100% gratuit et sans engagement. En 8 minutes, vous aurez une vision claire de vos priorités digitales."
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginTop: 10 }}>
        {['Gratuit', 'Sans engagement', 'Données protégées RGPD'].map((t, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 600, color: VIOLET, padding: '2px 8px', borderRadius: 999, background: '#EDE9FB' }}>✓ {t}</span>
        ))}
      </div>
    </div>
  )
}
