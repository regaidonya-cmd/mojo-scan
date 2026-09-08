'use client'

import type { DiagnosticState } from '@/types'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

// Textes d'accroche selon le profil
function buildAccroche(state: DiagnosticState): string {
  const obj = state.answers['P3'] ?? ''
  const objs = obj.split(',').map(v => v.trim())

  if (objs.includes('fidelisation') || objs.includes('clients')) {
    return "Votre activité présente des opportunités concrètes de croissance. Nous avons identifié 3 axes prioritaires pour développer votre chiffre d'affaires."
  }
  if (objs.includes('ia') || objs.includes('automatisation') || objs.includes('temps')) {
    return "Votre diagnostic révèle un potentiel important de gain de temps et de productivité. Voici les 3 leviers les plus impactants pour votre activité."
  }
  if (objs.includes('google') || objs.includes('reseaux') || objs.includes('site')) {
    return "Votre présence digitale peut être significativement renforcée. Nous avons identifié 3 axes prioritaires pour améliorer votre visibilité et attirer plus de clients."
  }
  return "Votre diagnostic est prêt. Nous avons identifié 3 axes prioritaires pour développer votre activité digitale."
}

// Labels lisibles pour les priorités
function priorityLabel(rank: number, priorities: any[]): string {
  if (!priorities || !priorities[rank - 1]) return ''
  return priorities[rank - 1].label
}

// Axes courts pour le teaser
function getTeaserAxes(state: DiagnosticState): string[] {
  const priorities = state.priorities ?? []
  return priorities.slice(0, 3).map(p => p.label)
}

const GRAD = 'linear-gradient(135deg, #6B35B8, #C8399A)'
const NIGHT = '#1A186E'
const MUTED = '#4B5563'
const OFF = '#F7F6FC'

export function StepTeaser({ state, next }: Props) {
  const accroche = buildAccroche(state)
  const priority1 = state.priorities?.[0]
  const axes = getTeaserAxes(state)
  const hasCompany = !!state.company?.name

  return (
    <div style={{ paddingTop: 32, paddingBottom: 24 }}>

      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <span style={{
          display: 'inline-block',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
          padding: '4px 12px', borderRadius: 999,
          background: 'rgba(107,53,184,0.1)', color: '#6B35B8',
          marginBottom: 12,
        }}>
          Votre diagnostic MOJO
        </span>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 'clamp(1.6rem, 4vw, 2rem)', fontWeight: 800,
          color: NIGHT, letterSpacing: '-0.04em', lineHeight: 1.1,
          margin: 0,
        }}>
          {hasCompany ? `${state.company!.name}` : 'Votre activité'} —{' '}
          <span style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            3 axes identifiés
          </span>
        </h1>
        <p style={{ marginTop: 10, color: MUTED, fontSize: 15, lineHeight: 1.6 }}>
          {accroche}
        </p>
      </div>

      {/* Priorité n°1 */}
      {priority1 && (
        <div style={{
          background: '#fff',
          border: '1.5px solid #E5E7EB',
          borderRadius: 16, padding: '18px 20px',
          marginBottom: 12,
          position: 'relative' as const, overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute' as const, top: 0, left: 0, right: 0, height: 3,
            background: GRAD,
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{priority1.icon}</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6B35B8', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 4px' }}>
                Priorité n°1
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: NIGHT, margin: '0 0 6px' }}>
                {priority1.label}
              </p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: 0 }}>
                {priority1.detail}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3 axes — floutés pour créer de l'envie */}
      <div style={{
        background: '#fff', border: '1.5px solid #E5E7EB',
        borderRadius: 16, padding: '18px 20px', marginBottom: 24,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 14px' }}>
          3 axes identifiés
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {axes.map((axe, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: i === 0 ? GRAD : 'rgba(107,53,184,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: i === 0 ? '#fff' : '#6B35B8',
                fontSize: 12, fontWeight: 700,
              }}>
                {i + 1}
              </div>
              <span style={{
                fontSize: 14, fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? NIGHT : MUTED,
                filter: i > 0 ? 'blur(4px)' : 'none',
                userSelect: 'none' as const,
              }}>
                {i === 0 ? axe : axes[i] || 'Axe prioritaire identifié'}
              </span>
            </div>
          ))}
        </div>
        <p style={{
          marginTop: 14, fontSize: 12, color: '#9CA3AF',
          fontStyle: 'italic',
        }}>
          → Les axes 2 et 3 sont détaillés dans votre rapport complet.
        </p>
      </div>

      {/* Indicateur de valeur */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(107,53,184,0.06), rgba(200,57,154,0.06))',
        border: '1px solid rgba(107,53,184,0.15)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>📋</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: NIGHT, margin: 0 }}>
            Votre rapport complet inclut
          </p>
          <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0', lineHeight: 1.5 }}>
            3 formations recommandées · Simulation de financement · Plan d'action 90 jours
            {state.recommendations?.[0] && ` · Parcours ${state.recommendations[0].item?.code?.startsWith('PARC') ? 'métier' : 'personnalisé'}`}
          </p>
        </div>
      </div>

      {/* CTA principal */}
      <button
        onClick={() => next()}
        style={{
          width: '100%', padding: '15px', borderRadius: 14,
          border: 'none', background: GRAD,
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 8px 24px rgba(200,57,154,0.35)',
          marginBottom: 10,
        }}
      >
        Recevoir mon rapport complet →
      </button>

      {/* CTA secondaire */}
      <a
        href="https://calendly.com/regai-donya/diagnostic-digital-offert-10-min-passez-a-l-action"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block', width: '100%', padding: '13px',
          borderRadius: 14, border: '1.5px solid #E5E7EB',
          background: '#fff', color: MUTED,
          fontSize: 14, fontWeight: 600,
          textAlign: 'center' as const, textDecoration: 'none',
          fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        📅 Prendre rendez-vous avec un conseiller
      </a>

      <p style={{ fontSize: 11, textAlign: 'center' as const, color: '#9CA3AF', marginTop: 12 }}>
        Diagnostic gratuit · Sans engagement · Résultats immédiats
      </p>
    </div>
  )
}
