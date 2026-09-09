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
import { TrustBar }      from './TrustBar'

const STEPS: DiagnosticStep[] = [
  'company','profile','objective','questions','project','teaser','capture','report'
]

// Labels étapes visibles prospect — P2 : transparence sur où on en est
const STEP_LABELS: Record<DiagnosticStep, string> = {
  company:   'Votre entreprise',
  profile:   'Votre profil',
  objective: 'Votre objectif',
  questions: 'Votre situation',
  project:   'Votre projet',
  teaser:    'Vos résultats',
  capture:   'Votre rapport',
  report:    'Rapport complet',
}

// Numéros d'étapes visibles (hors report)
const VISIBLE_STEPS = STEPS.filter(s => s !== 'report') as DiagnosticStep[]

interface Props { mode: ScanMode; prefill?: Partial<DiagnosticState> }

const initialState = (mode: ScanMode): DiagnosticState => ({
  mode, step: 'company', answers: {}, consentDiag: false, consentMarketing: false,
})

export function ScanShell({ mode, prefill }: Props) {
  const [state, setState] = useState<DiagnosticState>({ ...initialState(mode), ...prefill })

  const currentIdx    = STEPS.indexOf(state.step)
  const visibleIdx    = VISIBLE_STEPS.indexOf(state.step)
  const progress      = state.step === 'report'
    ? 100
    : Math.round((visibleIdx / (VISIBLE_STEPS.length - 1)) * 100)
  const stepNum       = visibleIdx >= 0 ? visibleIdx + 1 : null
  const totalSteps    = VISIBLE_STEPS.length

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [state.step])

  const next = useCallback((patch?: Partial<DiagnosticState>) => {
    setState(prev => {
      const nextIdx  = STEPS.indexOf(prev.step) + 1
      const nextStep = STEPS[nextIdx] ?? prev.step
      return { ...prev, ...(patch ?? {}), step: nextStep }
    })
  }, [])

  const back = useCallback(() => {
    setState(prev => {
      const prevIdx  = STEPS.indexOf(prev.step) - 1
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

  const isReport = state.step === 'report'

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6FC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#1A186E', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-white.png" alt="MOJO ACADÉMIE" style={{ height: 26, width: 'auto' }} />
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(200,57,154,0.2)', border: '1px solid rgba(200,57,154,0.3)', color: '#C8399A', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
              Scan
            </span>
            <ModeTag mode={mode} />
          </div>

          {/* Indicateur étape — P2 : toujours visible */}
          {!isReport && stepNum && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {state.step !== 'company' && (
                <button onClick={back} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px' }}>
                  ← Retour
                </button>
              )}
              <div style={{ textAlign: 'right' as const }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  Étape {stepNum}/{totalSteps}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 600 }}>
                  {STEP_LABELS[state.step]}
                </p>
              </div>
            </div>
          )}
          {isReport && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Rapport complet</span>
          )}
        </div>

        {/* Barre de progression — P2 */}
        {!isReport && <ProgressBar progress={progress} />}
      </header>

      {/* TRUST BAR — étape 1 uniquement */}
      {state.step === 'company' && (
        <div style={{ background: '#fff', borderBottom: '1px solid #EDEAF5' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
            <TrustBar />
          </div>
        </div>
      )}

      {/* CONTENU */}
      <main style={{ padding: '0 16px 80px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {renderStep()}
        </div>
      </main>

      {/* NOTE CONSEILLER (mode terrain/call) */}
      {(mode === 'terrain' || mode === 'call') && !isReport && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #EDEAF5', padding: '10px 16px' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <textarea
              placeholder="Note interne conseiller (non visible par le prospect)..."
              style={{ width: '100%', fontSize: 12, border: '1px solid #EDEAF5', borderRadius: 8, padding: '6px 10px', resize: 'none', height: 36, fontFamily: 'inherit' }}
              value={(state as any).adviser_note ?? ''}
              onChange={e => update({ ...(state as any), adviser_note: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
