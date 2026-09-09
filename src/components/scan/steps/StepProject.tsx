'use client'

import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { QUESTIONS } from '@/lib/scoring/questions'
import { NIGHT, VIOLET, FUCHSIA, MUTED, BORDER, SUBTLE, GRAD, GRAD_SOFT, R_MD, FONT_BODY } from '@/lib/design/tokens'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

const PROJECT_CODES = ['P4', 'P5', 'P6', 'P7']

export function StepProject({ state, next, update }: Props) {
  const questions = QUESTIONS.filter(q => PROJECT_CODES.includes(q.code))
  const answered  = PROJECT_CODES.slice(0, 3).filter(c => state.answers[c])
  const canContinue = answered.length >= 3

  const setAnswer = (code: string, value: string) => {
    update({ answers: { ...state.answers, [code]: value } })
  }

  return (
    <StepWrapper
      title="Votre projet"
      subtitle="Ces questions nous aident à qualifier votre besoin et vérifier vos possibilités de financement."
    >
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {questions.map(q => (
          <div key={q.code}>
            <p style={{ fontSize: 14, fontWeight: 600, color: MUTED, margin: '0 0 4px', fontFamily: FONT_BODY }}>{q.text}</p>
            {q.hint && (
              <p style={{ fontSize: 12, color: SUBTLE, margin: '0 0 10px', lineHeight: 1.5, fontFamily: FONT_BODY }}>{q.hint}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {q.options.map(opt => {
                const isSel = state.answers[q.code] === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAnswer(q.code, opt.value)}
                    style={{
                      width: '100%', textAlign: 'left' as const,
                      padding: '11px 14px', borderRadius: R_MD,
                      border: isSel ? `2px solid ${FUCHSIA}` : `1.5px solid ${BORDER}`,
                      background: isSel ? GRAD_SOFT : '#fff',
                      color: isSel ? NIGHT : MUTED,
                      fontSize: 13, fontWeight: isSel ? 600 : 400,
                      cursor: 'pointer', fontFamily: FONT_BODY,
                      transition: 'border-color 0.15s',
                    }}
                  >{opt.label}</button>
                )
              })}
            </div>
          </div>
        ))}

        <button
          onClick={() => next()}
          disabled={!canContinue}
          style={{
            width: '100%', padding: '14px',
            borderRadius: R_MD, border: 'none',
            background: canContinue ? GRAD : BORDER,
            color: canContinue ? '#fff' : MUTED,
            fontSize: 15, fontWeight: 600,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            fontFamily: FONT_BODY,
            boxShadow: canContinue ? '0 4px 16px rgba(200,57,154,0.28)' : 'none',
          }}
        >
          {canContinue ? 'Voir mes résultats' : 'Répondez aux questions pour continuer'}
        </button>
      </div>
    </StepWrapper>
  )
}
