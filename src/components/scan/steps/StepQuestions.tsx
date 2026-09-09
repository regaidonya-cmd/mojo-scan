'use client'

import { useState, useEffect, useRef } from 'react'
import type { DiagnosticState, Question } from '@/types'
import { NIGHT, VIOLET, FUCHSIA, MUTED, BORDER, LAV, GRAD, GRAD_SOFT, R_MD, FONT_BODY } from '@/lib/design/tokens'
import { StepWrapper } from '../StepWrapper'
import { getQuestionsForBranch } from '@/lib/scoring/questions'
import { detectBranch } from '@/lib/scoring/engine'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}




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
    return <div style={{ padding: 40, textAlign: 'center', color: MUTED }}>Chargement…</div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 20px' }}>
        <span style={{ fontSize: 12, color: '#A09BB8'  /* SUBTLE */ }}>Question {qIdx + 1} sur {questions.length}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {questions.map((_: any, i: number) => (
            <div key={i} style={{ width: i === qIdx ? 20 : 6, height: 6, borderRadius: 3, background: i <= qIdx ? GRAD : BORDER, transition: 'all 0.3s' }} />
          ))}
        </div>
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
                padding: '13px 16px', borderRadius: R_MD,
                border: isSel ? `2px solid ${FUCHSIA}` : `1.5px solid ${BORDER}`,
                background: isSel ? GRAD_SOFT : '#fff',
                color: isSel ? NIGHT : '#111020',
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
          style={{ marginTop: 16, fontSize: 13, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ← Question précédente
        </button>
      )}
    </StepWrapper>
  )
}
