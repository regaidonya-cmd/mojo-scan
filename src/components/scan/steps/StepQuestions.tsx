'use client'

import { useState, useEffect, useRef } from 'react'
import type { DiagnosticState, Question } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { getQuestionsForBranch, detectBranch } from '@/lib/scoring/questions'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

const GRAD = 'linear-gradient(135deg, #9B2FCC, #E040AB)'
const GRAD_LIGHT = 'linear-gradient(135deg, rgba(123,63,204,0.08), rgba(224,64,171,0.08))'

export function StepQuestions({ state, next, update }: Props) {
  const branch = state.branch ?? detectBranch(state.answers)
  const questions = getQuestionsForBranch(branch).filter(q =>
    !['P1','P2','P3','P4','P5','P6','P7'].includes(q.code)
  )
  const [qIdx, setQIdx] = useState(0)
  const didAutoNext = useRef(false)

  // Si pas de questions pour cette branche → passer directement
  useEffect(() => {
    if (questions.length === 0 && !didAutoNext.current) {
      didAutoNext.current = true
      next({ branch })
    }
  }, [])

  const current: Question | undefined = questions[qIdx]
  const answer = current ? state.answers[current.code] : undefined

  if (questions.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Chargement…</div>
  }

  if (!current) return null

  const handleSelect = (value: string) => {
    const newAnswers = { ...state.answers, [current.code]: value }
    update({ answers: newAnswers })
    setTimeout(() => {
      if (qIdx < questions.length - 1) {
        setQIdx(i => i + 1)
      } else {
        next({ answers: newAnswers, branch })
      }
    }, 300)
  }

  return (
    <StepWrapper title={current.text} subtitle={current.hint}>
      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 20px' }}>
        Question {qIdx + 1} sur {questions.length}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {current.options.map(opt => {
          const isSel = answer === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '13px 16px', borderRadius: 'var(--r-md)',
                border: isSel ? '2px solid #E040AB' : '1.5px solid #E5E7EB',
                background: isSel ? GRAD_LIGHT : '#fff',
                color: isSel ? 'var(--night)' : 'var(--text)',
                fontSize: 14, fontWeight: isSel ? 700 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {qIdx > 0 && (
        <button
          onClick={() => setQIdx(i => i - 1)}
          style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ← Question précédente
        </button>
      )}
    </StepWrapper>
  )
}
