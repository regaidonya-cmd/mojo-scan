'use client'

import { useState, useEffect } from 'react'
import type { DiagnosticState, Question } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { getQuestionsForBranch, detectBranch } from '@/lib/scoring/questions'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

export function StepQuestions({ state, next, back, update }: Props) {
  const branch = state.branch ?? detectBranch(state.answers)
  const questions = getQuestionsForBranch(branch).filter(q =>
    !['P1','P2','P3','P4','P5','P6','P7'].includes(q.code)
  )

  const [qIdx, setQIdx] = useState(0)
  const current: Question | undefined = questions[qIdx]

  const answer = state.answers[current?.code ?? '']

  const handleSelect = (value: string) => {
    const q = current!
    const opt = q.options.find(o => o.value === value)
    const newAnswers = { ...state.answers, [q.code]: value }
    update({ answers: newAnswers })

    // Avancer automatiquement
    setTimeout(() => {
      if (qIdx < questions.length - 1) {
        setQIdx(i => i + 1)
      } else {
        next({ answers: newAnswers, branch })
      }
    }, 300)
  }

  if (!current) {
    next({ branch })
    return null
  }

  return (
    <StepWrapper
      title={current.text}
      subtitle={current.hint}
    >
      {/* Compteur */}
      <div className="mt-1 mb-6 text-xs text-neutral-400">
        Question {qIdx + 1} sur {questions.length}
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {current.options.map(opt => {
          const selected = answer === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`
                w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium
                transition-all duration-150
                ${selected
                  ? 'bg-[#E85D26] text-white border-[#E85D26] shadow-sm'
                  : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                }
              `}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Navigation mode terrain/call */}
      {qIdx > 0 && (
        <button
          onClick={() => setQIdx(i => i - 1)}
          className="mt-6 text-sm text-neutral-400 hover:text-neutral-600"
        >
          ← Question précédente
        </button>
      )}
    </StepWrapper>
  )
}
