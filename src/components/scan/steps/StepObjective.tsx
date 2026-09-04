'use client'

import { useState } from 'react'
import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { QUESTIONS, detectBranch } from '@/lib/scoring/questions'

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
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const handleNext = () => {
    if (selected.length === 0) return
    // Prendre le premier choix comme objectif principal pour le scoring
    const main = selected[0]
    const newAnswers = { ...state.answers, P3: selected.join(',') }
    const branch = detectBranch({ ...newAnswers, P3: main })
    update({ answers: newAnswers, branch })
    next({ answers: newAnswers, branch })
  }

  return (
    <StepWrapper
      title="Quel est votre objectif principal ?"
      subtitle="Vous pouvez sélectionner plusieurs objectifs."
    >
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map(opt => {
          const isSelected = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '13px 16px',
                borderRadius: 'var(--r-md)',
                border: isSelected ? '2px solid #E040AB' : '1.5px solid #E5E7EB',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(123,63,204,0.08), rgba(224,64,171,0.08))'
                  : '#fff',
                color: isSelected ? 'var(--night)' : 'var(--text)',
                fontSize: 14,
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: isSelected ? '2px solid #E040AB' : '2px solid #D1D5DB',
                background: isSelected ? '#E040AB' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Bouton continuer */}
      <button
        onClick={handleNext}
        disabled={selected.length === 0}
        style={{
          marginTop: 24,
          width: '100%',
          padding: '14px',
          borderRadius: 'var(--r-md)',
          border: 'none',
          background: selected.length > 0
            ? 'linear-gradient(135deg, #9B2FCC, #E040AB)'
            : '#E5E7EB',
          color: selected.length > 0 ? '#fff' : '#9CA3AF',
          fontSize: 15,
          fontWeight: 700,
          cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
          boxShadow: selected.length > 0 ? '0 6px 20px rgba(224,64,171,0.35)' : 'none',
        }}
      >
        {selected.length === 0
          ? 'Choisissez au moins un objectif'
          : `Continuer avec ${selected.length} objectif${selected.length > 1 ? 's' : ''} →`}
      </button>
    </StepWrapper>
  )
}
