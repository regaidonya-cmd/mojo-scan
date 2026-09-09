'use client'
import type { DiagnosticState } from '@/types'
import { DonyaBlock } from '../DonyaBlock'
import {
  NIGHT, VIOLET, FUCHSIA, MUTED, SUBTLE, BORDER, LAV, LAV2, GRAD, GRAD_SOFT,
  R_MD, R_LG, R_XL, FONT_DISPLAY, FONT_BODY
} from '@/lib/design/tokens'

const CALENDLY = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/regai-donya/diagnostic-digital-offert-10-min-passez-a-l-action'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

function buildAccroche(answers: Record<string, string>): string {
  const obj = (answers['P3'] ?? '').split(',')[0]
  const MAP: Record<string, string> = {
    clients:       'Votre diagnostic est prêt. Nous avons identifié 3 axes concrets pour développer votre clientèle.',
    google:        'Votre visibilité sur Google peut être améliorée rapidement. Voici les 3 leviers identifiés.',
    reseaux:       'Vos réseaux sociaux ont un potentiel inexploité. Voici les 3 actions prioritaires.',
    fidelisation:  'Vos clients existants sont votre premier levier de croissance. Voici les 3 axes identifiés.',
    site:          'Un site web qui génère des contacts est atteignable. Voici les 3 priorités identifiées.',
    temps:         'Vous pouvez récupérer plusieurs heures par semaine. Voici les 3 leviers identifiés.',
    automatisation:'Votre activité a un fort potentiel d\'automatisation. Voici les 3 actions prioritaires.',
    ia:            'L\'IA peut changer votre quotidien. Voici les 3 formations les plus adaptées à votre profil.',
    organisation:  'Une organisation plus efficace est à portée. Voici les 3 priorités identifiées.',
    competences:   'Votre montée en compétences digitales est planifiable. Voici les 3 axes prioritaires.',
  }
  return MAP[obj] ?? 'Votre diagnostic est prêt. Nous avons identifié 3 axes prioritaires pour votre activité.'
}

export function StepTeaser({ state, next }: Props) {
  const accroche   = buildAccroche(state.answers)
  const priorities = state.priorities ?? []
  const p1         = priorities[0]
  const hasCompany = !!state.company?.name

  const calendlyUrl = `${CALENDLY}?name=${encodeURIComponent((state.contact?.firstname ?? '') + ' ' + (state.contact?.lastname ?? ''))}&email=${encodeURIComponent(state.contact?.email ?? '')}&utm_source=mojo_scan_teaser`

  return (
    <div style={{ paddingTop: 28, paddingBottom: 16 }}>

      {/* Titre */}
      <div style={{ marginBottom: 20 }}>
        {hasCompany && (
          <p style={{ fontSize: 11, fontWeight: 700, color: VIOLET, letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: '0 0 6px', fontFamily: FONT_BODY }}>
            {state.company!.name}
          </p>
        )}
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800, color: NIGHT, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 10px' }}>
          Votre diagnostic est prêt
        </h1>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.65, margin: 0, fontFamily: FONT_BODY }}>
          {accroche}
        </p>
      </div>

      {/* Priorité 1 visible */}
      {p1 && (
        <div style={{ background: '#fff', border: `1.5px solid ${FUCHSIA}`, borderRadius: R_LG, padding: '16px 18px', marginBottom: 12, position: 'relative' as const, overflow: 'hidden' }}>
          <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 3, background: GRAD }} />
          <p style={{ fontSize: 10, fontWeight: 700, color: FUCHSIA, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '4px 0 8px', fontFamily: FONT_BODY }}>
            Priorité n°1 identifiée
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: NIGHT, margin: '0 0 5px', lineHeight: 1.3, fontFamily: FONT_DISPLAY }}>
            {p1.label}
          </p>
          {p1.detail && (
            <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.5, fontFamily: FONT_BODY }}>
              {p1.detail}
            </p>
          )}
        </div>
      )}

      {/* 3 axes */}
      <div style={{ background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: R_LG, padding: '16px 18px', marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 14px', fontFamily: FONT_BODY }}>
          Les 3 axes de votre rapport
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: FONT_BODY }}>1</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: NIGHT, fontFamily: FONT_BODY }}>{priorities[0]?.label ?? 'Priorité principale'}</span>
          </div>
          {[1, 2].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: LAV, display: 'flex', alignItems: 'center', justifyContent: 'center', color: VIOLET, fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: FONT_BODY }}>{i + 1}</div>
              <span style={{ fontSize: 14, color: MUTED, filter: 'blur(5px)', userSelect: 'none' as const, fontFamily: FONT_BODY }}>
                {priorities[i]?.label ?? 'Axe prioritaire identifié'}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: SUBTLE, fontStyle: 'italic', margin: '12px 0 0', fontFamily: FONT_BODY }}>
          Les axes 2 et 3, les formations recommandées et le plan d'action sont dans votre rapport complet.
        </p>
      </div>

      {/* Contenu du rapport */}
      <div style={{ background: LAV, borderRadius: R_MD, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: R_MD, background: GRAD, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="white" strokeWidth="1.5"/><path d="M5 5h6M5 8h6M5 11h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: NIGHT, margin: '0 0 4px', fontFamily: FONT_DISPLAY }}>Votre rapport complet inclut</p>
          <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.6, fontFamily: FONT_BODY }}>
            3 formations recommandées avec prix et durée · Plan d'action 90 jours · Financement potentiel · Explication personnalisée
          </p>
        </div>
      </div>

      {/* CTA principal */}
      <button
        onClick={() => next()}
        style={{ width: '100%', padding: '15px', borderRadius: R_MD, border: 'none', background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_BODY, marginBottom: 12, boxShadow: '0 8px 24px rgba(200,57,154,0.35)' }}
      >
        Voir mon rapport complet
      </button>

      {/* Bloc Donya */}
      <DonyaBlock calendlyUrl={calendlyUrl} variant="teaser" />

      <p style={{ fontSize: 11, textAlign: 'center' as const, color: SUBTLE, margin: '4px 0 0', fontFamily: FONT_BODY }}>
        Résultats immédiats · Sans engagement
      </p>
    </div>
  )
}
