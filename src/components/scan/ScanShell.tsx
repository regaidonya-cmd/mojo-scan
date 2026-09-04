'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { DiagnosticState, DiagnosticStep, ScanMode } from '@/types'

import { StepCompany }   from './steps/StepCompany'
import { StepProfile }   from './steps/StepProfile'
import { StepObjective } from './steps/StepObjective'
import { StepQuestions } from './steps/StepQuestions'
import { StepProject }   from './steps/StepProject'
import { StepTeaser }    from './steps/StepTeaser'
import { StepCapture }   from './steps/StepCapture'
import { StepReport }    from './steps/StepReport'
import { ProgressBar }   from './ProgressBar'
import { ModeTag }       from './ModeTag'

const STEPS: DiagnosticStep[] = [
  'company','profile','objective','questions','project','teaser','capture','report'
]

const STEP_LABELS: Record<DiagnosticStep, string> = {
  company:'Entreprise', profile:'Profil', objective:'Objectif',
  questions:'Diagnostic', project:'Projet', teaser:'Résultats',
  capture:'Rapport', report:'Rapport complet',
}

interface Props { mode: ScanMode; prefill?: Partial<DiagnosticState> }

const initialState = (mode: ScanMode): DiagnosticState => ({
  mode, step:'company', answers:{}, consentDiag:false, consentMarketing:false,
})

export function ScanShell({ mode, prefill }: Props) {
  const [state, setState] = useState<DiagnosticState>({ ...initialState(mode), ...prefill })

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
    <div className="min-h-screen" style={{ background: 'var(--off)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header MOJO */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--night)', borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo-white.png" alt="MOJO ACADÉMIE" style={{ height: 28, width: 'auto' }} />
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px',
              borderRadius: 'var(--r-full)', background: 'rgba(224,64,171,0.15)',
              border: '1px solid rgba(224,64,171,0.3)', color: '#E040AB',
              letterSpacing: '0.05em', textTransform: 'uppercase' as const
            }}>Scan</span>
            <ModeTag mode={mode} />
          </div>
          {state.step !== 'report' && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              {STEP_LABELS[state.step]}
            </span>
          )}
        </div>
        {state.step !== 'report' && <ProgressBar progress={progress} />}
      </header>

      {/* Main */}
      <main style={{ paddingTop: 64, paddingBottom: 96, paddingLeft: 16, paddingRight: 16 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {state.step === 'company'   && <StepCompany   {...stepProps} />}
              {state.step === 'profile'   && <StepProfile   {...stepProps} />}
              {state.step === 'objective' && <StepObjective {...stepProps} />}
              {state.step === 'questions' && <StepQuestions {...stepProps} />}
              {state.step === 'project'   && <StepProject   {...stepProps} />}
              {state.step === 'teaser'    && <StepTeaser    {...stepProps} />}
              {state.step === 'capture'   && <StepCapture   {...stepProps} />}
              {state.step === 'report'    && <StepReport    {...stepProps} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer conseiller */}
      {(mode === 'terrain' || mode === 'call') && state.step !== 'report' && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #e5e7eb', padding: '10px 16px'
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {state.step !== 'company' && (
              <button onClick={back} style={{ fontSize: 13, color: '#6b7280', padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
                ← Retour
              </button>
            )}
            <textarea
              placeholder="Note interne conseiller..."
              style={{ flex: 1, fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', resize: 'none', height: 36, fontFamily: 'inherit' }}
              value={state.adviser_note ?? ''}
              onChange={e => update({ adviser_note: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
