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
  const [selected, setSelected] = useState(state.answers['P3'] ?? '')

  const handleSelect = (value: string) => {
    setSelected(value)
    const newAnswers = { ...state.answers, P3: value }
    const branch = detectBranch(newAnswers)
    update({ answers: newAnswers, branch })
    // Délai visuel pour voir la sélection avant de passer
    setTimeout(() => next({ answers: newAnswers, branch }), 400)
  }

  return (
    <StepWrapper
      title="Quel est votre objectif principal ?"
      subtitle="Choisissez ce qui compte le plus pour vous aujourd'hui."
    >
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map(opt => {
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
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
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: isSelected ? '5px solid #E040AB' : '2px solid #D1D5DB',
                transition: 'all 0.15s',
              }} />
              {opt.label}
            </button>
          )
        })}
      </div>
    </StepWrapper>
  )
}
