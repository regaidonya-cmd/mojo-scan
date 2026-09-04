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

const PROJECT_QUESTIONS = ['P4','P5','P6','P7']

export function StepProject({ state, next, update }: Props) {
  const questions = QUESTIONS.filter(q => PROJECT_QUESTIONS.includes(q.code))
  const allAnswered = PROJECT_QUESTIONS.slice(0, 3).every(c => state.answers[c])

  const setAnswer = (code: string, value: string) => {
    update({ answers: { ...state.answers, [code]: value } })
  }

  return (
    <StepWrapper
      title="Votre projet en quelques mots"
      subtitle="Ces questions nous aident à qualifier votre besoin et identifier votre financement."
    >
      <div className="mt-6 space-y-6">
        {questions.map(q => (
          <div key={q.code}>
            <p className="text-sm font-medium text-neutral-700 mb-1">{q.text}</p>
            {q.hint && <p className="text-xs text-neutral-400 mb-2.5">{q.hint}</p>}
            <div className="flex flex-col gap-2">
              {q.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnswer(q.code, opt.value)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${state.answers[q.code] === opt.value
                      ? 'bg-[#E85D26] text-white border-[#E85D26]'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {allAnswered && (
        <button
          onClick={() => next()}
          className="mt-8 w-full bg-[#E85D26] text-white py-3.5 rounded-xl font-medium hover:bg-[#d04f1e] transition-colors"
        >
          Voir mes résultats →
        </button>
      )}
    </StepWrapper>
  )
}
