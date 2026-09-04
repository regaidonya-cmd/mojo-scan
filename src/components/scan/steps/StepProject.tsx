'use client'

import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { QUESTIONS } from '@/lib/scoring/questions'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

const PROJECT_CODES = ['P4','P5','P6','P7']
const GRAD = 'linear-gradient(135deg, #9B2FCC, #E040AB)'
const GRAD_LIGHT = 'linear-gradient(135deg, rgba(123,63,204,0.08), rgba(224,64,171,0.08))'

export function StepProject({ state, next, update }: Props) {
  const questions = QUESTIONS.filter(q => PROJECT_CODES.includes(q.code))
  const answered = PROJECT_CODES.slice(0, 3).filter(c => state.answers[c])
  const allAnswered = answered.length >= 3

  const setAnswer = (code: string, value: string) => {
    update({ answers: { ...state.answers, [code]: value } })
  }

  return (
    <StepWrapper title="Votre projet en quelques mots" subtitle="Ces questions nous aident à identifier votre financement et qualifier votre besoin.">
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {questions.map(q => (
          <div key={q.code}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>{q.text}</p>
            {q.hint && <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>{q.hint}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {q.options.map(opt => {
                const isSel = state.answers[q.code] === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAnswer(q.code, opt.value)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '11px 14px', borderRadius: 'var(--r-md)',
                      border: isSel ? '2px solid #E040AB' : '1.5px solid #E5E7EB',
                      background: isSel ? GRAD_LIGHT : '#fff',
                      color: isSel ? 'var(--night)' : 'var(--text)',
                      fontSize: 13, fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >{opt.label}</button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => next()}
        disabled={!allAnswered}
        style={{
          marginTop: 24, width: '100%', padding: '14px',
          borderRadius: 'var(--r-md)', border: 'none',
          background: allAnswered ? GRAD : '#E5E7EB',
          color: allAnswered ? '#fff' : '#9CA3AF',
          fontSize: 15, fontWeight: 700,
          cursor: allAnswered ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit', transition: 'all 0.2s',
          boxShadow: allAnswered ? '0 6px 20px rgba(224,64,171,0.35)' : 'none',
        }}
      >
        {allAnswered ? 'Voir mes résultats →' : 'Répondez aux questions pour continuer'}
      </button>
    </StepWrapper>
  )
}
