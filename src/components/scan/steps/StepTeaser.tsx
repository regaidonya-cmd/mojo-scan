'use client'

import type { DiagnosticState } from '@/types'
import { DonyaBlock } from '../DonyaBlock'

const NIGHT   = '#1A186E'
const VIOLET  = '#6B35B8'
const FUCHSIA = '#C8399A'
const MUTED   = '#6B6680'
const GRAD    = 'linear-gradient(135deg, #6B35B8, #C8399A)'
const LAV     = '#EDE9FB'
const CALENDLY = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/regai-donya/diagnostic-digital-offert-10-min-passez-a-l-action'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

// Accroche personnalisée par objectif
function buildAccroche(answers: Record<string, string>): string {
  const obj = (answers['P3'] ?? '').split(',')[0]
  const MAP: Record<string, string> = {
    clients:       "Votre diagnostic est prêt. Nous avons identifié 3 axes concrets pour développer votre clientèle.",
    google:        "Bonne nouvelle : votre visibilité sur Google peut être améliorée rapidement. Voici les 3 leviers identifiés.",
    reseaux:       "Vos réseaux sociaux ont un potentiel inexploité. Voici les 3 actions prioritaires que nous avons identifiées.",
    fidelisation:  "Vos clients existants sont votre premier levier de croissance. Voici les 3 axes pour mieux les fidéliser.",
    site:          "Un site web qui génère des contacts — c'est tout à fait atteignable. Voici les 3 priorités identifiées.",
    temps:         "Vous pouvez récupérer plusieurs heures par semaine. Voici les 3 leviers identifiés pour votre activité.",
    automatisation:"Votre activité a un fort potentiel d'automatisation. Voici les 3 actions prioritaires.",
    ia:            "L'IA peut vraiment changer votre quotidien. Voici les 3 formations les plus adaptées à votre profil.",
    organisation:  "Une organisation plus efficace est à portée de main. Voici les 3 priorités identifiées.",
    competences:   "Votre montée en compétences digitales est parfaitement planifiable. Voici les 3 axes prioritaires.",
  }
  return MAP[obj] ?? "Votre diagnostic est prêt. Nous avons identifié 3 axes prioritaires pour votre activité."
}

// Icônes par objectif
const OBJ_ICONS: Record<string, string> = {
  clients:'🎯', google:'🔍', reseaux:'📱', fidelisation:'💛', site:'🌐',
  temps:'⏱', automatisation:'⚙️', ia:'🤖', organisation:'📋', competences:'📚',
}

export function StepTeaser({ state, next }: Props) {
  const accroche  = buildAccroche(state.answers)
  const priorities = state.priorities ?? []
  const p1        = priorities[0]
  const hasCompany = !!state.company?.name

  const calendlyUrl = `${CALENDLY}?name=${encodeURIComponent((state.contact?.firstname ?? '') + ' ' + (state.contact?.lastname ?? ''))}&email=${encodeURIComponent(state.contact?.email ?? '')}&utm_source=mojo_scan_teaser`

  return (
    <div style={{ paddingTop: 28, paddingBottom: 16 }}>

      {/* Titre personnalisé */}
      <div style={{ marginBottom: 20 }}>
        {hasCompany && (
          <p style={{ fontSize: 12, fontWeight: 700, color: VIOLET, letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: '0 0 6px' }}>
            {state.company!.name}
          </p>
        )}
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800, color: NIGHT, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 10px' }}>
          Votre diagnostic est prêt ✓
        </h1>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.65, margin: 0 }}>
          {accroche}
        </p>
      </div>

      {/* Priorité #1 — visible en clair */}
      {p1 && (
        <div style={{ background: '#fff', border: `1.5px solid ${FUCHSIA}`, borderRadius: 16, padding: '16px 18px', marginBottom: 12, position: 'relative' as const, overflow: 'hidden' }}>
          <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 3, background: GRAD }} />
          <p style={{ fontSize: 10, fontWeight: 700, color: FUCHSIA, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '4px 0 8px' }}>
            Priorité n°1 identifiée
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{p1.icon ?? OBJ_ICONS[(state.answers['P3'] ?? '').split(',')[0]] ?? '🎯'}</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: NIGHT, margin: '0 0 5px', lineHeight: 1.3 }}>{p1.label}</p>
              {p1.detail && <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.5 }}>{p1.detail}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 3 axes — P1 : axes 2 et 3 masqués avec raison explicite */}
      <div style={{ background: '#fff', border: '1.5px solid #EDEAF5', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 14px' }}>
          Les 3 axes de votre rapport
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {/* Axe 1 — visible */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: NIGHT }}>
              {priorities[0]?.label ?? 'Priorité principale'}
            </span>
          </div>
          {/* Axes 2 et 3 — masqués avec message rassurant */}
          {[1, 2].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: LAV, display: 'flex', alignItems: 'center', justifyContent: 'center', color: VIOLET, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 14, color: MUTED, filter: 'blur(5px)', userSelect: 'none' as const }}>
                {priorities[i]?.label ?? 'Axe prioritaire identifié'}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#A09BB8', fontStyle: 'italic', margin: '12px 0 0' }}>
          Les axes 2 et 3, les formations recommandées et le plan d'action 90 jours sont dans votre rapport complet.
        </p>
      </div>

      {/* Ce que contient le rapport — P2 : transparent */}
      <div style={{ background: LAV, borderRadius: 14, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>📋</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: NIGHT, margin: '0 0 4px' }}>Votre rapport complet inclut</p>
          <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.6 }}>
            3 formations recommandées avec prix et durée · Plan d'action 90 jours · Financement potentiel · Formation prioritaire avec explication personnalisée
          </p>
        </div>
      </div>

      {/* CTA principal */}
      <button
        onClick={() => next()}
        style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, boxShadow: '0 8px 24px rgba(200,57,154,0.35)' }}
      >
        Voir mon rapport complet →
      </button>

      {/* Bloc Donya — réassurance humaine avant CTA RDV */}
      <DonyaBlock calendlyUrl={calendlyUrl} variant="teaser" />

      <p style={{ fontSize: 11, textAlign: 'center' as const, color: '#A09BB8', margin: '4px 0 0' }}>
        Résultats immédiats · Sans engagement
      </p>
    </div>
  )
}
