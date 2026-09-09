'use client'

// ── DonyaBlock — Bloc réassurance humaine avec photo Donya ─────
// Usage : StepTeaser, StepReport (CTA final), StepCapture
// Règles :
//   - Jamais d'avatar artificiel si photo absente → contenu sans photo
//   - Pas de répétition dans les premières étapes
//   - Hiérarchie visuelle : logo MOJO > photo Donya

const NIGHT  = '#1A186E'
const VIOLET = '#6B35B8'
const MUTED  = '#6B6680'
const GRAD   = 'linear-gradient(135deg, #6B35B8, #C8399A)'

interface DonyaBlockProps {
  calendlyUrl: string
  // Variant : 'teaser' (sobre) | 'report' (sombre sur fond NIGHT) | 'capture' (inline compact)
  variant?: 'teaser' | 'report' | 'capture'
}

export function DonyaBlock({ calendlyUrl, variant = 'teaser' }: DonyaBlockProps) {

  if (variant === 'capture') {
    // Compact — dans StepCapture, uniquement si améliore confiance
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: '#F7F6FC', borderRadius: 12,
        padding: '12px 14px', marginBottom: 16,
        border: '1px solid #EDEAF5',
      }}>
        <DonyaPhoto size={48} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: NIGHT, margin: '0 0 2px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Donya — MOJO ACADÉMIE
          </p>
          <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.45 }}>
            Je valide avec vous les recommandations et les possibilités de financement.
          </p>
        </div>
      </div>
    )
  }

  if (variant === 'report') {
    // Sur fond sombre — bloc CTA du rapport final
    return (
      <div style={{ marginBottom: 20 }}>
        {/* Photo + identité */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <DonyaPhoto size={56} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 2px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Donya
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              Fondatrice — MOJO ACADÉMIE
            </p>
          </div>
        </div>

        {/* Message */}
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 20px' }}>
          Je vous aide à valider vos priorités, identifier la formation adaptée et vérifier vos possibilités de financement.
        </p>

        {/* CTA */}
        <a
          href={calendlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', width: '100%', padding: '14px',
            borderRadius: 12, background: GRAD,
            color: '#fff', fontSize: 14, fontWeight: 700,
            textDecoration: 'none', textAlign: 'center' as const,
            boxShadow: '0 8px 24px rgba(200,57,154,0.45)',
            boxSizing: 'border-box' as const, marginBottom: 8,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '0.01em',
          }}
        >
          Réserver mon échange diagnostic
        </a>
        <p style={{ fontSize: 11, textAlign: 'center' as const, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Gratuit · 20 min · Sans engagement
        </p>
      </div>
    )
  }

  // Variant 'teaser' (défaut) — sobre, avant le CTA principal
  return (
    <div style={{
      background: '#fff', border: '1px solid #EDEAF5',
      borderRadius: 16, padding: '18px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <DonyaPhoto size={52} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: NIGHT, margin: '0 0 2px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Donya
          </p>
          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
            Fondatrice — MOJO ACADÉMIE
          </p>
        </div>
      </div>
      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }}>
        Besoin d'en parler ? Je vous aide à valider vos priorités, identifier la formation adaptée et vérifier vos possibilités de financement.
      </p>
      <a
        href={calendlyUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block', padding: '12px 16px',
          borderRadius: 10, background: NIGHT,
          color: '#fff', fontSize: 13, fontWeight: 700,
          textDecoration: 'none', textAlign: 'center' as const,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxSizing: 'border-box' as const,
        }}
      >
        Réserver mon échange diagnostic
      </a>
      <p style={{ fontSize: 11, textAlign: 'center' as const, color: '#A09BB8', margin: '8px 0 0' }}>
        Gratuit · 20 min · Sans engagement
      </p>
    </div>
  )
}

// ── Photo Donya — avec fallback propre ─────────────────────────
function DonyaPhoto({ size }: { size: number }) {
  const radius = size // Cercle complet

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      flexShrink: 0,
      border: '2px solid #EDEAF5',
      // Fond neutre visible si photo absente — PAS d'initiale
      background: '#F7F6FC',
    }}>
      <img
        src="/donya.jpg"
        alt="Donya, fondatrice de MOJO ACADÉMIE"
        width={size}
        height={size}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover' as const,
          objectPosition: 'center top',
          display: 'block',
        }}
        onError={(e) => {
          // Fallback : masquer l'image, le fond #F7F6FC reste visible
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    </div>
  )
}
