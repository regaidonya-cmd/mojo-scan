'use client'

import { useEffect, useState } from 'react'
import type { DiagnosticState } from '@/types'
import { StepWrapper } from '../StepWrapper'
import { computeBusinessScore, computeLeadScore, computePriorities, detectBranch } from '@/lib/scoring/engine'
import { computeFunding } from '@/lib/funding/engine'

interface Props {
  state: DiagnosticState
  next: (patch?: Partial<DiagnosticState>) => void
  back: () => void
  update: (patch: Partial<DiagnosticState>) => void
}

const SCORE_COLORS = (s: number) =>
  s >= 70 ? 'text-emerald-600' :
  s >= 40 ? 'text-amber-600'   : 'text-red-500'

export function StepTeaser({ state, next, update }: Props) {
  const [computed, setComputed] = useState(false)

  useEffect(() => {
    if (!computed) {
      const branch      = state.branch ?? detectBranch(state.answers)
      const bizScore    = computeBusinessScore(state.answers)
      const leadScore   = computeLeadScore(state.answers, bizScore)
      const priorities  = computePriorities(bizScore, branch, state.answers)
      const funding     = computeFunding(state.company, state.answers)
      update({ businessScore: bizScore, leadScore, priorities, funding: funding })
      setComputed(true)
    }
  }, [])

  const { businessScore, priorities, funding } = state

  if (!businessScore || !priorities) {
    return (
      <div className="pt-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-[#E85D26] rounded-full animate-spin" />
      </div>
    )
  }

  const topFunding = funding?.[0]

  return (
    <StepWrapper title="Voici votre aperçu">
      {/* Score global */}
      <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-6 text-center">
        <p className="text-sm text-neutral-500 mb-1">Score digital global</p>
        <div className={`text-6xl font-semibold tabular-nums ${SCORE_COLORS(businessScore.global)}`}>
          {businessScore.global}
          <span className="text-2xl text-neutral-400">/100</span>
        </div>
        <p className="text-sm text-neutral-400 mt-2">
          {businessScore.global < 40 ? 'Fort potentiel d\'amélioration détecté' :
           businessScore.global < 70 ? 'Des axes d\'amélioration identifiés' :
           'Bonne base — quelques optimisations à prévoir'}
        </p>
      </div>

      {/* 3 priorités (floutées partiellement) */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Vos 3 priorités identifiées</p>
        {priorities.map((p, i) => (
          <div
            key={i}
            className={`bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-start gap-3
              ${i >= 2 ? 'opacity-50 blur-[2px] select-none' : ''}`}
          >
            <span className="text-xl">{p.icon}</span>
            <div>
              <p className="text-sm font-medium text-neutral-800">{p.label}</p>
              {i === 0 && (
                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{p.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Financement */}
      {topFunding && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-emerald-700">💶 Financement potentiel détecté</p>
          <p className="text-sm text-emerald-800 font-medium mt-0.5">{topFunding.funder}</p>
          <p className="text-xs text-emerald-600">{topFunding.coverage_label}</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-6 bg-neutral-900 rounded-2xl p-5 text-center">
        <p className="text-white font-medium text-base">
          Recevez votre rapport complet
        </p>
        <p className="text-neutral-400 text-sm mt-1 mb-4">
          Parcours recommandé · Détail des priorités · Simulation de financement
        </p>
        <button
          onClick={() => next()}
          className="w-full bg-[#E85D26] text-white py-3.5 rounded-xl font-medium hover:bg-[#d04f1e] transition-colors"
        >
          Recevoir mon diagnostic →
        </button>
      </div>
    </StepWrapper>
  )
}
