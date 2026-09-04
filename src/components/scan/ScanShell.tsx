'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DiagnosticState, DiagnosticStep, ScanMode } from '@/types'

// Steps
import { StepCompany }    from './steps/StepCompany'
import { StepProfile }    from './steps/StepProfile'
import { StepObjective }  from './steps/StepObjective'
import { StepQuestions }  from './steps/StepQuestions'
import { StepProject }    from './steps/StepProject'
import { StepTeaser }     from './steps/StepTeaser'
import { StepCapture }    from './steps/StepCapture'
import { StepReport }     from './steps/StepReport'

// UI
import { ProgressBar }   from './ProgressBar'
import { ModeTag }       from './ModeTag'

const STEPS: DiagnosticStep[] = [
  'company','profile','objective','questions','project','teaser','capture','report'
]

const STEP_LABELS: Record<DiagnosticStep, string> = {
  company:   'Entreprise',
  profile:   'Profil',
  objective: 'Objectif',
  questions: 'Diagnostic',
  project:   'Projet',
  teaser:    'Résultats',
  capture:   'Rapport',
  report:    'Rapport complet',
}

interface Props {
  mode: ScanMode
  prefill?: Partial<DiagnosticState>
}

const initialState = (mode: ScanMode): DiagnosticState => ({
  mode,
  step: 'company',
  answers: {},
  consentDiag: false,
  consentMarketing: false,
})

export function ScanShell({ mode, prefill }: Props) {
  const [state, setState] = useState<DiagnosticState>({
    ...initialState(mode),
    ...prefill,
  })

  const currentIdx = STEPS.indexOf(state.step)
  const progress   = Math.round((currentIdx / (STEPS.length - 1)) * 100)

  const next = useCallback((patch?: Partial<DiagnosticState>) => {
    setState(prev => {
      const nextStep = STEPS[STEPS.indexOf(prev.step) + 1]
      return { ...prev, ...patch, step: nextStep ?? prev.step }
    })
  }, [])

  const back = useCallback(() => {
    setState(prev => {
      const prevStep = STEPS[STEPS.indexOf(prev.step) - 1]
      return { ...prev, step: prevStep ?? prev.step }
    })
  }, [])

  const update = useCallback((patch: Partial<DiagnosticState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  const stepProps = { state, next, back, update }

  return (
    <div className="min-h-screen bg-[#F8F7F4] font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight text-neutral-900">
              MOJO<span className="text-[#E85D26]"> Scan</span>
            </span>
            <ModeTag mode={mode} />
          </div>
          {state.step !== 'report' && (
            <span className="text-xs text-neutral-400 tabular-nums">
              {STEP_LABELS[state.step]} · {Math.round((currentIdx + 1) / STEPS.length * 10)} min
            </span>
          )}
        </div>
        {state.step !== 'report' && (
          <ProgressBar progress={progress} />
        )}
      </header>

      {/* Main */}
      <main className="pt-16 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {state.step === 'company'    && <StepCompany    {...stepProps} />}
              {state.step === 'profile'    && <StepProfile    {...stepProps} />}
              {state.step === 'objective'  && <StepObjective  {...stepProps} />}
              {state.step === 'questions'  && <StepQuestions  {...stepProps} />}
              {state.step === 'project'    && <StepProject    {...stepProps} />}
              {state.step === 'teaser'     && <StepTeaser     {...stepProps} />}
              {state.step === 'capture'    && <StepCapture    {...stepProps} />}
              {state.step === 'report'     && <StepReport     {...stepProps} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer fixe mode terrain/call */}
      {(mode === 'terrain' || mode === 'call') && state.step !== 'report' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
            {state.step !== 'company' && (
              <button
                onClick={back}
                className="text-sm text-neutral-500 hover:text-neutral-800 px-3 py-2 rounded-lg hover:bg-neutral-50"
              >
                ← Précédent
              </button>
            )}
            <textarea
              placeholder="Note interne conseiller (non visible par le prospect)..."
              className="flex-1 text-xs border border-neutral-200 rounded-lg px-3 py-2 resize-none h-9 focus:outline-none focus:border-neutral-400"
              value={state.adviser_note ?? ''}
              onChange={e => update({ adviser_note: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
