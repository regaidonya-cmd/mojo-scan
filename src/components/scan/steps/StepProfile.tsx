'use client'

import { useState } from 'react'
import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { QUESTIONS } from '@/lib/scoring/questions'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

const GRAD = 'linear-gradient(135deg, #6B35B8, #C8399A)'
const GRAD_LIGHT = 'linear-gradient(135deg, rgba(107,53,184,0.08), rgba(200,57,154,0.08))'

export function StepProfile({ state, next, update }: Props) {
  const q1 = QUESTIONS.find(q => q.code === 'P1')!
  const q2 = QUESTIONS.find(q => q.code === 'P2')!

  const [role, setRole] = useState(state.answers['P1'] ?? '')
  const [bene, setBene] = useState(state.answers['P2'] ?? '')

  const setAnswer = (code: string, value: string) => {
    if (code === 'P1') setRole(value)
    if (code === 'P2') setBene(value)
    update({ answers: { ...state.answers, [code]: value } })
  }

  const canContinue = role && bene

  const optBtn = (isSelected: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        padding: '12px 16px',
        borderRadius: 'var(--r-md)',
        border: isSelected ? '2px solid #C8399A' : '1.5px solid #E5E7EB',
        background: isSelected ? GRAD_LIGHT : '#fff',
        color: isSelected ? 'var(--night)' : 'var(--text)',
        fontSize: 14, fontWeight: isSelected ? 700 : 500,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
    >{label}</button>
  )

  return (
    <StepWrapper title="Quelques questions rapides" subtitle="Pour adapter vos recommandations à votre profil.">
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>{q1.text}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {q1.options.map(opt => optBtn(role === opt.value, opt.label, () => setAnswer('P1', opt.value)))}
          </div>
        </div>

        {role && (
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>{q2.text}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {q2.options.map(opt => optBtn(bene === opt.value, opt.label, () => setAnswer('P2', opt.value)))}
            </div>
          </div>
        )}

        {canContinue && (
          <button
            onClick={() => next()}
            style={{
              marginTop: 8, width: '100%', padding: '14px',
              borderRadius: 'var(--r-md)', border: 'none',
              background: GRAD, color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 6px 20px rgba(200,57,154,0.35)',
              transition: 'all 0.2s',
            }}
          >Continuer →</button>
        )}
      </div>
    </StepWrapper>
  )
}
