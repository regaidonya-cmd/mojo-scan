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

export function StepProfile({ state, next, update }: Props) {
  const q1 = QUESTIONS.find(q => q.code === 'P1')!
  const q2 = QUESTIONS.find(q => q.code === 'P2')!

  const role = state.answers['P1']
  const bene = state.answers['P2']

  const setAnswer = (code: string, value: string) => {
    update({ answers: { ...state.answers, [code]: value } })
  }

  const canContinue = role && bene

  return (
    <StepWrapper
      title="Parlez-nous de vous"
      subtitle="Pour personnaliser votre diagnostic selon votre situation."
    >
      <div className="mt-6 space-y-6">
        {/* Rôle */}
        <div>
          <p className="text-sm font-medium text-neutral-700 mb-2.5">{q1.text}</p>
          <div className="grid grid-cols-2 gap-2">
            {q1.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => setAnswer('P1', opt.value)}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                  ${role === opt.value
                    ? 'bg-[#E85D26] text-white border-[#E85D26]'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bénéficiaire */}
        {role && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2.5">{q2.text}</p>
            <div className="grid grid-cols-2 gap-2">
              {q2.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnswer('P2', opt.value)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${bene === opt.value
                      ? 'bg-[#E85D26] text-white border-[#E85D26]'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {canContinue && (
        <button
          onClick={() => next()}
          className="mt-8 w-full bg-[#E85D26] text-white py-3.5 rounded-xl font-medium hover:bg-[#d04f1e] transition-colors"
        >
          Continuer →
        </button>
      )}
    </StepWrapper>
  )
}
