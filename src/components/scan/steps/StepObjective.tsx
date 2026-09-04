'use client'

import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { QUESTIONS } from '@/lib/scoring/questions'
import { detectBranch } from '@/lib/scoring/questions'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

export function StepObjective({ state, next }: Props) {
  const q = QUESTIONS.find(q => q.code === 'P3')!
  const selected = state.answers['P3']

  const handleSelect = (value: string) => {
    const newAnswers = { ...state.answers, P3: value }
    const branch = detectBranch(newAnswers)
    setTimeout(() => next({ answers: newAnswers, branch }), 250)
  }

  return (
    <StepWrapper
      title="Quel est votre objectif principal ?"
      subtitle="Choisissez ce qui est le plus important pour vous aujourd'hui."
    >
      <div className="mt-6 flex flex-col gap-2">
        {q.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all
              ${selected === opt.value
                ? 'bg-[#E85D26] text-white border-[#E85D26]'
                : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </StepWrapper>
  )
}
