'use client'

import { useState } from 'react'
import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { NIGHT, VIOLET, FUCHSIA, MUTED, BORDER, GRAD, GRAD_SOFT, R_MD, FONT_BODY, FONT_DISPLAY } from '@/lib/design/tokens'
import { QUESTIONS } from '@/lib/scoring/questions'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}


// Question statut — définie ici, pas dans QUESTIONS[] (évite conflits de parsing)
const STATUT_OPTIONS = [
  { value: 'gerant_tns', label: 'Gérant / Indépendant / TNS (non-salarié)' },
  { value: 'gerant_sal', label: 'Dirigeant salarié de ma société' },
  { value: 'salarie',    label: 'Salarié' },
  { value: 'liberal',    label: 'Profession libérale' },
  { value: 'artisan',    label: 'Artisan (inscrit à la chambre des métiers)' },
]

export function StepProfile({ state, next, update }: Props) {
  const q1 = QUESTIONS.find(q => q.code === 'P1')!
  const q2 = QUESTIONS.find(q => q.code === 'P2')!

  const [role,   setRole]   = useState(state.answers['P1'] ?? '')
  const [bene,   setBene]   = useState(state.answers['P2'] ?? '')
  const [statut, setStatut] = useState(state.answers['P_STATUT'] ?? '')

  const setAnswer = (code: string, value: string) => {
    if (code === 'P1') setRole(value)
    if (code === 'P2') setBene(value)
    if (code === 'P_STATUT') setStatut(value)
    update({ answers: { ...state.answers, [code]: value } })
  }

  const canContinue = role && bene && statut

  const optBtn = (isSelected: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        padding: '12px 16px', borderRadius: 'var(--r-md)',
        border: isSelected ? `2px solid ${FUCHSIA}` : `1.5px solid ${BORDER}`,
        background: isSelected ? GRAD_SOFT : '#fff',
        color: isSelected ? NIGHT : MUTED,
        fontSize: 14, fontWeight: isSelected ? 600 : 400,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const,
        transition: 'border-color 0.15s',
      }}
    >{label}</button>
  )

  return (
    <StepWrapper title="Quelques questions rapides" subtitle="Pour adapter vos recommandations à votre profil.">
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* P1 — Rôle */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: MUTED, margin: '0 0 10px' }}>{q1.text}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {q1.options.map(opt => optBtn(role === opt.value, opt.label, () => setAnswer('P1', opt.value)))}
          </div>
        </div>

        {/* P2 — Bénéficiaire */}
        {role && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: MUTED, margin: '0 0 10px' }}>{q2.text}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {q2.options.map(opt => optBtn(bene === opt.value, opt.label, () => setAnswer('P2', opt.value)))}
            </div>
          </div>
        )}

        {/* P_STATUT — Statut juridique */}
        {bene && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: MUTED, margin: '0 0 4px' }}>
              Quel est votre statut professionnel ?
            </p>
            <p style={{ fontSize: 12, color: '#A09BB8', margin: '0 0 10px', lineHeight: 1.5 }}>
              Cette information permet d'identifier les dispositifs de financement adaptés.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {STATUT_OPTIONS.map(opt => optBtn(statut === opt.value, opt.label, () => setAnswer('P_STATUT', opt.value)))}
            </div>
          </div>
        )}

        {/* Continuer */}
        {canContinue && (
          <button
            onClick={() => next()}
            style={{
              marginTop: 4, width: '100%', padding: '14px',
              borderRadius: 'var(--r-md)', border: 'none',
              background: GRAD, color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(200,57,154,0.28)',
            }}
          >Continuer</button>
        )}
      </div>
    </StepWrapper>
  )
}
