'use client'

import { useState, useCallback, useEffect } from 'react'
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
  mode, step: 'company', answers: {}, consentDiag: false, consentMarketing: false,
})

export function ScanShell({ mode, prefill }: Props) {
  const [state, setState] = useState<DiagnosticState>({ ...initialState(mode), ...prefill })

  const currentIdx = STEPS.indexOf(state.step)
  const progress = Math.round((currentIdx / (STEPS.length - 1)) * 100)

  // Scroll vers le haut à chaque changement d'étape
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.step])

  const next = useCallback((patch?: Partial<DiagnosticState>) => {
    setState(prev => {
      const nextIdx = STEPS.indexOf(prev.step) + 1
      const nextStep = STEPS[nextIdx] ?? prev.step
      return { ...prev, ...(patch ?? {}), step: nextStep }
    })
  }, [])

  const back = useCallback(() => {
    setState(prev => {
      const prevIdx = STEPS.indexOf(prev.step) - 1
      const prevStep = STEPS[prevIdx] ?? prev.step
      return { ...prev, step: prevStep }
    })
  }, [])

  const update = useCallback((patch: Partial<DiagnosticState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  const stepProps = { state, next, back, update }

  const renderStep = () => {
    switch (state.step) {
      case 'company':   return <StepCompany   {...stepProps} />
      case 'profile':   return <StepProfile   {...stepProps} />
      case 'objective': return <StepObjective {...stepProps} />
      case 'questions': return <StepQuestions {...stepProps} />
      case 'project':   return <StepProject   {...stepProps} />
      case 'teaser':    return <StepTeaser    {...stepProps} />
      case 'capture':   return <StepCapture   {...stepProps} />
      case 'report':    return <StepReport    {...stepProps} />
      default:          return null
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--night)', borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{
          maxWidth: 640, margin: '0 auto', padding: '0 16px',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo-white.png" alt="MOJO ACADÉMIE" style={{ height: 28, width: 'auto' }} />
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px',
              borderRadius: 999, background: 'rgba(224,64,171,0.15)',
              border: '1px solid rgba(224,64,171,0.3)', color: '#E040AB',
              letterSpacing: '0.05em', textTransform: 'uppercase' as const
            }}>Scan</span>
            <ModeTag mode={mode} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {state.step !== 'company' && state.step !== 'report' && (
              <button
                onClick={back}
                style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.5)',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit'
                }}
              >← Retour</button>
            )}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              {STEP_LABELS[state.step]}
            </span>
          </div>
        </div>
        {state.step !== 'report' && <ProgressBar progress={progress} />}
      </header>

      {/* Contenu */}
      <main style={{ padding: '0 16px 80px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {renderStep()}
        </div>
      </main>

      {/* Note conseiller (mode terrain/call) */}
      {(mode === 'terrain' || mode === 'call') && state.step !== 'report' && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #e5e7eb', padding: '10px 16px'
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <textarea
              placeholder="Note interne conseiller (non visible par le prospect)..."
              style={{
                width: '100%', fontSize: 12, border: '1px solid #e5e7eb',
                borderRadius: 8, padding: '6px 10px', resize: 'none',
                height: 36, fontFamily: 'inherit'
              }}
              value={state.adviser_note ?? ''}
              onChange={e => update({ adviser_note: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
