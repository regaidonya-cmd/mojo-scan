'use client'
import {
  NIGHT, VIOLET, FUCHSIA, MUTED, SUBTLE, BORDER, LAV, LAV2, OFF, GRAD,
  R_MD, R_LG, R_XL, FONT_DISPLAY, FONT_BODY
} from '@/lib/design/tokens'

interface DonyaBlockProps {
  calendlyUrl: string
  variant?: 'teaser' | 'report' | 'capture'
}

function DonyaPhoto({ size }: { size: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      border: `2px solid ${BORDER}`, background: OFF,
    }}>
      <img
        src="/donya.jpg"
        alt="Donya, fondatrice de MOJO ACADÉMIE"
        width={size} height={size}
        style={{ width: '100%', height: '100%', objectFit: 'cover' as const, objectPosition: 'center top', display: 'block' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

export function DonyaBlock({ calendlyUrl, variant = 'teaser' }: DonyaBlockProps) {

  if (variant === 'capture') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: OFF, borderRadius: R_MD, padding: '12px 14px', marginBottom: 16, border: `1px solid ${BORDER}` }}>
        <DonyaPhoto size={44} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: NIGHT, margin: '0 0 2px', fontFamily: FONT_DISPLAY }}>Donya — MOJO ACADÉMIE</p>
          <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.45, fontFamily: FONT_BODY }}>Je valide avec vous les recommandations et les possibilités de financement.</p>
        </div>
      </div>
    )
  }

  if (variant === 'report') {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <DonyaPhoto size={52} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 2px', fontFamily: FONT_DISPLAY }}>Donya</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, fontFamily: FONT_BODY }}>Fondatrice — MOJO ACADÉMIE</p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 18px', fontFamily: FONT_BODY }}>
          Besoin d'en parler ? Je vous aide à valider vos priorités, identifier la formation adaptée et vérifier vos possibilités de financement.
        </p>
        <a href={calendlyUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', width: '100%', padding: '14px', borderRadius: R_MD, background: GRAD, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' as const, marginBottom: 8, boxShadow: '0 8px 24px rgba(200,57,154,0.45)', boxSizing: 'border-box' as const, fontFamily: FONT_BODY }}
          onClick={() => { fetch('/api/scan/event', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ event_type: 'calendly_clicked' }) }).catch(() => {}) }}
        >
          Réserver mon échange diagnostic
        </a>
        <p style={{ fontSize: 11, textAlign: 'center' as const, color: 'rgba(255,255,255,0.45)', margin: 0, fontFamily: FONT_BODY }}>
          Gratuit · 20 min · Sans engagement
        </p>
      </div>
    )
  }

  // Variant teaser
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: R_LG, padding: '18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <DonyaPhoto size={50} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: NIGHT, margin: '0 0 2px', fontFamily: FONT_DISPLAY }}>Donya</p>
          <p style={{ fontSize: 12, color: MUTED, margin: 0, fontFamily: FONT_BODY }}>Fondatrice — MOJO ACADÉMIE</p>
        </div>
      </div>
      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: '0 0 14px', fontFamily: FONT_BODY }}>
        Besoin d'en parler ? Je vous aide à valider vos priorités, identifier la formation adaptée et vérifier vos possibilités de financement.
      </p>
      <a href={calendlyUrl} target="_blank" rel="noopener noreferrer"
        style={{ display: 'block', padding: '12px 16px', borderRadius: R_MD, background: NIGHT, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center' as const, fontFamily: FONT_BODY, boxSizing: 'border-box' as const }}
      >
        Réserver mon échange diagnostic
      </a>
      <p style={{ fontSize: 11, textAlign: 'center' as const, color: SUBTLE, margin: '8px 0 0', fontFamily: FONT_BODY }}>
        Gratuit · 20 min · Sans engagement
      </p>
    </div>
  )
}
