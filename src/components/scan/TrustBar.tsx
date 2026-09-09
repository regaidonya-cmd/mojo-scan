'use client'
import { NIGHT, VIOLET, FUCHSIA, MUTED, SUBTLE, BORDER, LAV, LAV2, GRAD, R_MD, FONT_BODY, FONT_DISPLAY } from '@/lib/design/tokens'

const items = [
  { label: 'Certifié Qualiopi' },
  { label: '8 minutes' },
  { label: 'Gratuit' },
  { label: 'Sans engagement' },
  { label: 'Données protégées' },
]

export function TrustBar() {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, justifyContent: 'center', padding: '10px 0 2px' }}>
      {items.map((item, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 600, color: MUTED,
          padding: '3px 10px', borderRadius: 999,
          background: '#fff', border: `1px solid ${BORDER}`,
          fontFamily: FONT_BODY,
        }}>
          {item.label}
        </span>
      ))}
    </div>
  )
}

export function TrustCompact() {
  return (
    <div style={{ background: LAV, borderRadius: R_MD, padding: '14px 16px', marginTop: 20, border: `1px solid ${LAV2}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: NIGHT, margin: '0 0 2px', fontFamily: FONT_DISPLAY }}>Donya Regai</p>
          <p style={{ fontSize: 11, color: MUTED, margin: 0, fontFamily: FONT_BODY }}>Fondatrice — MOJO ACADÉMIE</p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' as const }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#fff', color: VIOLET, display: 'block', marginBottom: 4, fontFamily: FONT_BODY }}>
            Qualiopi
          </span>
          <div style={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {[...Array(5)].map((_, i) => (
              <svg key={i} width="10" height="10" viewBox="0 0 14 14" fill="#F59E0B"><path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.3l-3.7 2 .7-4.1L1 5.3l4.2-.7z"/></svg>
            ))}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: '0 0 10px', fontStyle: 'italic', fontFamily: FONT_BODY }}>
        "En 8 minutes, vous aurez une vision claire de vos priorités et des formations les plus adaptées à votre situation."
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
        {['Gratuit', 'Sans engagement', 'RGPD'].map((t, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 600, color: VIOLET, padding: '2px 8px', borderRadius: 999, background: '#fff', fontFamily: FONT_BODY }}>{t}</span>
        ))}
      </div>
    </div>
  )
}
