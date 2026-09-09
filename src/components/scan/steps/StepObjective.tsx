'use client'

import { useState } from 'react'
import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { QUESTIONS } from '@/lib/scoring/questions'
import { detectBranch } from '@/lib/scoring/engine'
import { NIGHT, VIOLET, FUCHSIA, MUTED, BORDER, LAV, LAV2, GRAD, GRAD_SOFT, R_MD, FONT_BODY } from '@/lib/design/tokens'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

export function StepObjective({ state, next, update }: Props) {
  const q = QUESTIONS.find(q => q.code === 'P3')!
  const [selected, setSelected] = useState<string[]>(
    state.answers['P3'] ? state.answers['P3'].split(',') : []
  )

  const toggle = (value: string) => {
    setSelected(prev => {
      if (prev.includes(value)) return prev.filter(v => v !== value)
      if (prev.length >= 3) return prev
      return [...prev, value]
    })
  }

  const handleNext = () => {
    if (selected.length === 0) return
    const main = selected[0]
    const newAnswers = { ...state.answers, P3: selected.join(',') }
    const branch = detectBranch({ ...newAnswers, P3: main })
    update({ answers: newAnswers, branch })
    next({ answers: newAnswers, branch })
  }

  const canContinue = selected.length > 0

  return (
    <StepWrapper
      title="Quel est votre objectif principal ?"
      subtitle="Sélectionnez jusqu'à 3 objectifs — du plus important au moins important."
    >
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>

        {q.options.map((opt, idx) => {
          const isSel  = selected.includes(opt.value)
          const rank   = selected.indexOf(opt.value) + 1
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              style={{
                width: '100%', textAlign: 'left' as const,
                padding: '13px 14px', borderRadius: R_MD,
                border: isSel ? `2px solid ${FUCHSIA}` : `1.5px solid ${BORDER}`,
                background: isSel ? GRAD_SOFT : '#fff',
                color: isSel ? NIGHT : MUTED,
                fontSize: 14, fontWeight: isSel ? 600 : 400,
                cursor: 'pointer', fontFamily: FONT_BODY,
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'border-color 0.15s',
              }}
            >
              {/* Indicateur de rang / checkbox */}
              <span style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                border: isSel ? 'none' : `2px solid ${BORDER}`,
                background: isSel ? GRAD : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
                fontFamily: FONT_BODY,
              }}>
                {isSel ? (
                  rank <= 3 ? rank : (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )
                ) : null}
              </span>
              {opt.label}
            </button>
          )
        })}

        {/* Compteur discret */}
        {selected.length > 0 && (
          <p style={{ fontSize: 11, color: VIOLET, fontWeight: 600, textAlign: 'center' as const, margin: '4px 0 0' }}>
            {selected.length}/3 sélectionné{selected.length > 1 ? 's' : ''}
          </p>
        )}

        <button
          onClick={handleNext}
          disabled={!canContinue}
          style={{
            marginTop: 8, width: '100%', padding: '14px',
            borderRadius: R_MD, border: 'none',
            background: canContinue ? GRAD : BORDER,
            color: canContinue ? '#fff' : MUTED,
            fontSize: 15, fontWeight: 600,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            fontFamily: FONT_BODY,
            boxShadow: canContinue ? '0 4px 16px rgba(200,57,154,0.28)' : 'none',
          }}
        >
          {canContinue ? 'Continuer' : 'Sélectionnez votre objectif principal'}
        </button>
      </div>
    </StepWrapper>
  )
}
